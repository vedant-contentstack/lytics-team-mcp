/**
 * Vercel Serverless Function for MCP using Streamable HTTP Transport
 *
 * This endpoint uses WebStandardStreamableHTTPServerTransport which works
 * properly with Vercel's serverless architecture - no SSE session state issues.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

import { SupabaseDB } from "../src/db/supabase.js";
import { EmbeddingService } from "../src/embeddings/huggingface.js";
import { saveConversation } from "../src/tools/save.js";
import {
  searchConversations,
  findRelatedConversations,
} from "../src/tools/search.js";
import {
  getConversation,
  listConversations,
  deleteConversation,
  updateVisibility,
} from "../src/tools/retrieve.js";

// Initialize services (these are reused across invocations in Vercel)
const db = new SupabaseDB(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const embeddings = new EmbeddingService(process.env.HUGGINGFACE_API_KEY!);

// Store transports by session ID for stateful mode
const transports = new Map<string, WebStandardStreamableHTTPServerTransport>();

function createMcpServer(teamId: string, userId: string): McpServer {
  const server = new McpServer({
    name: "lytics-mcp",
    version: "1.0.0",
  });

  // Register save_conversation tool
  server.registerTool(
    "save_conversation",
    {
      description:
        "Save the current conversation to your team's knowledge base. Use this to preserve valuable discussions about bugs, code explanations, solutions, or any insights worth sharing with your team.",
      inputSchema: {
        title: z.string().describe("A descriptive title for the conversation"),
        content: z.string().describe("The full conversation content to save"),
        is_public: z
          .boolean()
          .default(true)
          .describe(
            "Whether this conversation is visible to the whole team (true) or just you (false)"
          ),
        tags: z
          .array(z.string())
          .optional()
          .describe(
            "Optional tags to categorize the conversation (e.g., ['bug', 'auth', 'frontend'])"
          ),
        repo_context: z
          .string()
          .optional()
          .describe("The repository or project this conversation is about"),
        file_context: z
          .array(z.string())
          .optional()
          .describe("List of file paths discussed in this conversation"),
        generate_summary: z
          .boolean()
          .default(true)
          .describe("Whether to auto-generate a summary using AI"),
      },
    },
    async (args) => {
      const result = await saveConversation(
        args,
        db,
        embeddings,
        teamId,
        userId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                message: "Conversation saved successfully!",
                id: result.id,
                summary: result.summary,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Register search_knowledge tool
  server.registerTool(
    "search_knowledge",
    {
      description:
        "Search your team's conversation history for relevant discussions. Use this when tackling a new problem to see if teammates have already solved something similar.",
      inputSchema: {
        query: z
          .string()
          .describe(
            "What are you looking for? Describe the problem, topic, or code area"
          ),
        limit: z
          .number()
          .min(1)
          .max(20)
          .default(5)
          .describe("Maximum number of results to return (1-20)"),
        include_private: z
          .boolean()
          .default(false)
          .describe("Include your own private conversations in results"),
      },
    },
    async (args) => {
      const results = await searchConversations(
        args,
        db,
        embeddings,
        teamId,
        userId
      );

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No related conversations found. This might be a new topic for your team!",
            },
          ],
        };
      }

      const formatted = results.map((r, i) => ({
        rank: i + 1,
        id: r.id,
        title: r.title,
        summary: r.summary,
        author: r.user_id,
        similarity: `${(r.similarity * 100).toFixed(1)}%`,
        tags: r.tags,
        date: r.created_at,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                found: results.length,
                conversations: formatted,
                tip: "Use get_conversation with an ID to see the full content",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Register find_related tool
  server.registerTool(
    "find_related",
    {
      description:
        "Automatically find related past conversations based on your current context. Paste what you're working on and discover if teammates have tackled similar issues.",
      inputSchema: {
        context: z
          .string()
          .describe(
            "The current conversation context or problem you're working on"
          ),
      },
    },
    async (args) => {
      const results = await findRelatedConversations(
        args,
        db,
        embeddings,
        teamId,
        userId
      );

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No related conversations found in your team's knowledge base.",
            },
          ],
        };
      }

      const formatted = results.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        relevance: `${(r.similarity * 100).toFixed(1)}%`,
        author: r.user_id,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                message: "🔍 Found related discussions from your team:",
                related: formatted,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Register get_conversation tool
  server.registerTool(
    "get_conversation",
    {
      description:
        "Retrieve the full content of a specific saved conversation by its ID.",
      inputSchema: {
        id: z.string().describe("The UUID of the conversation to retrieve"),
      },
    },
    async (args) => {
      const conversation = await getConversation(args, db, teamId, userId);

      if (!conversation) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Conversation not found or you don't have access to it.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: conversation.id,
                title: conversation.title,
                author: conversation.user_id,
                visibility: conversation.is_public ? "public" : "private",
                tags: conversation.tags,
                repo: conversation.repo_context,
                files: conversation.file_context,
                summary: conversation.summary,
                created: conversation.created_at,
                content: conversation.content,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Register list_conversations tool
  server.registerTool(
    "list_conversations",
    {
      description:
        "List saved conversations from your team's knowledge base. Filter by your own or browse team-wide insights.",
      inputSchema: {
        only_mine: z
          .boolean()
          .default(false)
          .describe("Only show your own conversations"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Filter by specific tags"),
        limit: z
          .number()
          .min(1)
          .max(50)
          .default(20)
          .describe("Maximum number of results (1-50)"),
      },
    },
    async (args) => {
      const conversations = await listConversations(args, db, teamId, userId);

      const formatted = conversations.map((c) => ({
        id: c.id,
        title: c.title,
        author: c.user_id,
        visibility: c.is_public ? "public" : "private",
        tags: c.tags,
        date: c.created_at,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: conversations.length,
                conversations: formatted,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Register delete_conversation tool
  server.registerTool(
    "delete_conversation",
    {
      description:
        "Delete one of your saved conversations. You can only delete conversations you created.",
      inputSchema: {
        id: z.string().describe("The UUID of the conversation to delete"),
      },
    },
    async (args) => {
      const result = await deleteConversation(args, db, teamId, userId);

      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? "Conversation deleted successfully."
              : "Failed to delete conversation.",
          },
        ],
      };
    }
  );

  // Register update_visibility tool
  server.registerTool(
    "update_visibility",
    {
      description:
        "Change a conversation between public (team-visible) and private (only you). You can only modify your own conversations.",
      inputSchema: {
        id: z.string().describe("The UUID of the conversation to update"),
        is_public: z
          .boolean()
          .describe("Set to true for public, false for private"),
      },
    },
    async (args) => {
      const result = await updateVisibility(args, db, teamId, userId);

      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Conversation visibility updated to ${args.is_public ? "public" : "private"}.`
              : "Failed to update visibility.",
          },
        ],
      };
    }
  );

  return server;
}

// Vercel Edge Function handler
export default async function handler(request: Request): Promise<Response> {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, mcp-session-id, X-Team-ID, X-User-ID",
      },
    });
  }

  // Extract team/user from query params or headers
  const url = new URL(request.url);
  const teamId =
    request.headers.get("x-team-id") ||
    url.searchParams.get("team_id") ||
    "default";
  const userId =
    request.headers.get("x-user-id") ||
    url.searchParams.get("user_id") ||
    "anonymous";

  // Get or create session ID
  const sessionId = request.headers.get("mcp-session-id");

  // For existing sessions, reuse the transport
  let transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    // Create new transport in stateless mode for serverless compatibility
    // Each request is self-contained
    transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      enableJsonResponse: true, // Use JSON responses instead of SSE where possible
    });

    // Create and connect the MCP server
    const server = createMcpServer(teamId, userId);
    await server.connect(transport);

    // Store transport for session reuse (within same serverless instance)
    transport.onsessioninitialized = (newSessionId: string) => {
      transports.set(newSessionId, transport!);
    };
  }

  // Handle the request
  const response = await transport.handleRequest(request);

  // Add CORS headers to response
  const corsHeaders = new Headers(response.headers);
  corsHeaders.set("Access-Control-Allow-Origin", "*");
  corsHeaders.set("Access-Control-Expose-Headers", "mcp-session-id");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: corsHeaders,
  });
}

// Vercel config for Edge Runtime
export const config = {
  runtime: "edge",
};

