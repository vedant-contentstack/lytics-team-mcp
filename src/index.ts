#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { SupabaseDB } from "./db/supabase.js";
import { EmbeddingService } from "./embeddings/huggingface.js";
import { loadConfig } from "./types.js";

import { saveConversation } from "./tools/save.js";
import {
  searchConversations,
  findRelatedConversations,
} from "./tools/search.js";
import {
  getConversation,
  listConversations,
  deleteConversation,
  updateVisibility,
} from "./tools/retrieve.js";

// Load configuration from environment
const config = loadConfig();

// Initialize services
const db = new SupabaseDB(config.supabaseUrl, config.supabaseKey);
const embeddings = new EmbeddingService(config.huggingfaceApiKey);

// Create MCP server
const server = new McpServer({
  name: "lytics-mcp",
  version: "1.0.0",
});

// Register tools using the new API
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
      config.teamId,
      config.userId
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
      config.teamId,
      config.userId
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
      config.teamId,
      config.userId
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
    const conversation = await getConversation(
      args,
      db,
      config.teamId,
      config.userId
    );

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
      tags: z.array(z.string()).optional().describe("Filter by specific tags"),
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(20)
        .describe("Maximum number of results (1-50)"),
    },
  },
  async (args) => {
    const conversations = await listConversations(
      args,
      db,
      config.teamId,
      config.userId
    );

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
    const result = await deleteConversation(
      args,
      db,
      config.teamId,
      config.userId
    );

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
    const result = await updateVisibility(
      args,
      db,
      config.teamId,
      config.userId
    );

    return {
      content: [
        {
          type: "text" as const,
          text: result.success
            ? `Conversation visibility updated to ${
                args.is_public ? "public" : "private"
              }.`
            : "Failed to update visibility.",
        },
      ],
    };
  }
);

server.registerTool(
  "get_user_id",
  {
    description:
      "Get your unique User ID. Use this to share your identity with teammates or access your conversations from another machine.",
    inputSchema: {},
  },
  async () => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              user_id: config.userId,
              team_id: config.teamId,
              message: "This is your unique identifier. Share it with teammates to let them find your public conversations.",
              storage_location: "~/.lytics-mcp/user-id.txt",
              tip: "To use this ID on another machine, copy it to ~/.lytics-mcp/user-id.txt on that machine.",
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lytics MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
