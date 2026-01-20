/**
 * Vercel Serverless Function for MCP SSE Transport
 * 
 * This endpoint handles SSE connections for the MCP server.
 * Vercel supports streaming responses for SSE.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

import { SupabaseDB } from "../src/db/supabase.js";
import { EmbeddingService } from "../src/embeddings/huggingface.js";
import { saveConversation } from "../src/tools/save.js";
import { searchConversations, findRelatedConversations } from "../src/tools/search.js";
import { getConversation, listConversations, deleteConversation, updateVisibility } from "../src/tools/retrieve.js";

// Initialize services
const db = new SupabaseDB(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const embeddings = new EmbeddingService(process.env.HUGGINGFACE_API_KEY!);

function createMcpServer(teamId: string, userId: string): McpServer {
  const server = new McpServer({
    name: "lytics-mcp",
    version: "1.0.0",
  });

  // Register save_conversation tool
  server.registerTool(
    "save_conversation",
    {
      description: "Save the current conversation to your team's knowledge base.",
      inputSchema: {
        title: z.string(),
        content: z.string(),
        is_public: z.boolean().default(true),
        tags: z.array(z.string()).optional(),
        repo_context: z.string().optional(),
        file_context: z.array(z.string()).optional(),
        generate_summary: z.boolean().default(true),
      },
    },
    async (args) => {
      const result = await saveConversation(args, db, embeddings, teamId, userId);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ success: true, id: result.id, summary: result.summary }, null, 2),
        }],
      };
    }
  );

  // Register search_knowledge tool
  server.registerTool(
    "search_knowledge",
    {
      description: "Search your team's conversation history.",
      inputSchema: {
        query: z.string(),
        limit: z.number().min(1).max(20).default(5),
        include_private: z.boolean().default(false),
      },
    },
    async (args) => {
      const results = await searchConversations(args, db, embeddings, teamId, userId);
      if (results.length === 0) {
        return { content: [{ type: "text" as const, text: "No conversations found." }] };
      }
      const formatted = results.map((r, i) => ({
        rank: i + 1,
        id: r.id,
        title: r.title,
        summary: r.summary,
        similarity: `${(r.similarity * 100).toFixed(1)}%`,
        tags: r.tags,
      }));
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ found: results.length, conversations: formatted }, null, 2),
        }],
      };
    }
  );

  // Register find_related tool
  server.registerTool(
    "find_related",
    {
      description: "Find related conversations based on context.",
      inputSchema: { context: z.string() },
    },
    async (args) => {
      const results = await findRelatedConversations(args, db, embeddings, teamId, userId);
      if (results.length === 0) {
        return { content: [{ type: "text" as const, text: "No related conversations found." }] };
      }
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ related: results.map(r => ({ id: r.id, title: r.title, similarity: `${(r.similarity * 100).toFixed(1)}%` })) }, null, 2),
        }],
      };
    }
  );

  // Register get_conversation tool
  server.registerTool(
    "get_conversation",
    {
      description: "Get full conversation content by ID.",
      inputSchema: { id: z.string() },
    },
    async (args) => {
      const conversation = await getConversation(args, db, teamId, userId);
      if (!conversation) {
        return { content: [{ type: "text" as const, text: "Conversation not found." }] };
      }
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(conversation, null, 2),
        }],
      };
    }
  );

  // Register list_conversations tool
  server.registerTool(
    "list_conversations",
    {
      description: "List saved conversations.",
      inputSchema: {
        only_mine: z.boolean().default(false),
        tags: z.array(z.string()).optional(),
        limit: z.number().min(1).max(50).default(20),
      },
    },
    async (args) => {
      const conversations = await listConversations(args, db, teamId, userId);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ count: conversations.length, conversations: conversations.map(c => ({ id: c.id, title: c.title, tags: c.tags })) }, null, 2),
        }],
      };
    }
  );

  // Register delete_conversation tool
  server.registerTool(
    "delete_conversation",
    {
      description: "Delete a conversation you created.",
      inputSchema: { id: z.string() },
    },
    async (args) => {
      const result = await deleteConversation(args, db, teamId, userId);
      return {
        content: [{ type: "text" as const, text: result.success ? "Deleted." : "Failed to delete." }],
      };
    }
  );

  // Register update_visibility tool
  server.registerTool(
    "update_visibility",
    {
      description: "Change conversation visibility.",
      inputSchema: { id: z.string(), is_public: z.boolean() },
    },
    async (args) => {
      const result = await updateVisibility(args, db, teamId, userId);
      return {
        content: [{ type: "text" as const, text: result.success ? "Updated." : "Failed to update." }],
      };
    }
  );

  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Team-ID, X-User-ID, Cache-Control");
  
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  // Get team/user from query params or headers
  const teamId = (req.headers["x-team-id"] as string) || (req.query.team_id as string) || "default";
  const userId = (req.headers["x-user-id"] as string) || (req.query.user_id as string) || "anonymous";

  console.log(`SSE connection: team=${teamId}, user=${userId}`);

  // Create MCP server and SSE transport
  const transport = new SSEServerTransport("/api/messages", res);
  const server = createMcpServer(teamId, userId);

  await server.connect(transport);
  
  // Keep connection alive
  await transport.start();
}

// Vercel config for streaming
export const config = {
  maxDuration: 60, // Max 60 seconds for hobby plan
};

