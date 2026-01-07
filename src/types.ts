/**
 * Core types for the Lytics MCP server
 */

export interface Conversation {
  id: string;
  user_id: string;
  team_id: string;
  title: string;
  summary: string | null;
  content: string;
  is_public: boolean;
  tags: string[];
  repo_context: string | null;
  file_context: string[];
  created_at: string;
  updated_at: string;
}

export interface ConversationInsert {
  user_id: string;
  team_id: string;
  title: string;
  summary?: string;
  content: string;
  embedding: number[];
  is_public: boolean;
  tags?: string[];
  repo_context?: string;
  file_context?: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  summary: string | null;
  user_id: string;
  tags: string[];
  similarity: number;
  created_at: string;
  repo_context: string | null;
}

export interface ConversationMatch {
  conversation: Conversation;
  similarity: number;
}

export interface Config {
  supabaseUrl: string;
  supabaseKey: string;
  huggingfaceApiKey: string;
  teamId: string;
  userId: string;
}

export function loadConfig(): Config {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
  const teamId = process.env.TEAM_ID;
  const userId = process.env.USER_ID;

  if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
  if (!supabaseKey) throw new Error("SUPABASE_SERVICE_KEY is required");
  if (!huggingfaceApiKey) throw new Error("HUGGINGFACE_API_KEY is required");
  if (!teamId) throw new Error("TEAM_ID is required");
  if (!userId) throw new Error("USER_ID is required");

  return {
    supabaseUrl,
    supabaseKey,
    huggingfaceApiKey,
    teamId,
    userId,
  };
}

