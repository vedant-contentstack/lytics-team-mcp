/**
 * Core types for the Lytics MCP server
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

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

/**
 * Get or create a unique user ID stored locally
 */
function getUserId(): string {
  const configDir = join(homedir(), '.lytics-mcp');
  const configFile = join(configDir, 'user-id.txt');

  // Create config directory if it doesn't exist
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Check if user ID already exists
  if (existsSync(configFile)) {
    const userId = readFileSync(configFile, 'utf-8').trim();
    if (userId) {
      return userId;
    }
  }

  // Generate new user ID
  const userId = randomUUID();
  writeFileSync(configFile, userId, 'utf-8');

  console.error('');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🎉 New User ID Generated!');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('');
  console.error(`  Your User ID: ${userId}`);
  console.error('');
  console.error('  📁 Stored in: ~/.lytics-mcp/user-id.txt');
  console.error('');
  console.error('  💡 Use this ID to:');
  console.error('     - Fetch your private conversations');
  console.error('     - Share with team to identify your contributions');
  console.error('     - Access your data from another machine');
  console.error('');
  console.error('  🔒 Keep it safe! This ID is tied to your conversations.');
  console.error('');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('');

  return userId;
}

export function loadConfig(): Config {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
  const teamId = process.env.TEAM_ID;
  
  // Get or generate user ID automatically
  const userId = getUserId();

  if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
  if (!supabaseKey) throw new Error("SUPABASE_SERVICE_KEY is required");
  if (!huggingfaceApiKey) throw new Error("HUGGINGFACE_API_KEY is required");
  if (!teamId) throw new Error("TEAM_ID is required");

  // Display user ID on every startup (less verbose than first time)
  console.error(`\n🔑 Your User ID: ${userId}\n`);

  return {
    supabaseUrl,
    supabaseKey,
    huggingfaceApiKey,
    teamId,
    userId,
  };
}

