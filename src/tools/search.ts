import { z } from "zod";
import type { SupabaseDB } from "../db/supabase.js";
import type { EmbeddingService } from "../embeddings/huggingface.js";
import type { SearchResult } from "../types.js";

export const SearchConversationsSchema = z.object({
  query: z
    .string()
    .describe("What are you looking for? Describe the problem, topic, or code area you want to find related conversations about"),
  limit: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe("Maximum number of results to return"),
  include_private: z
    .boolean()
    .default(false)
    .describe("Include your own private conversations in search results"),
});

export type SearchConversationsInput = z.infer<typeof SearchConversationsSchema>;

export async function searchConversations(
  input: SearchConversationsInput,
  db: SupabaseDB,
  embeddings: EmbeddingService,
  teamId: string,
  userId: string
): Promise<SearchResult[]> {
  // Generate embedding for the search query
  const queryEmbedding = await embeddings.generateEmbedding(input.query);

  // Search for similar conversations
  const results = await db.searchSimilar(
    queryEmbedding,
    teamId,
    userId,
    input.limit,
    input.include_private
  );

  return results;
}

export const FindRelatedSchema = z.object({
  context: z
    .string()
    .describe("The current conversation context or problem you're working on - paste the relevant parts"),
});

export type FindRelatedInput = z.infer<typeof FindRelatedSchema>;

export async function findRelatedConversations(
  input: FindRelatedInput,
  db: SupabaseDB,
  embeddings: EmbeddingService,
  teamId: string,
  userId: string
): Promise<SearchResult[]> {
  // Generate embedding for the current context
  const contextEmbedding = await embeddings.generateEmbedding(input.context);

  // Search for related conversations - always include private for context
  const results = await db.searchSimilar(
    contextEmbedding,
    teamId,
    userId,
    3, // Return top 3 most relevant
    true // Include user's private conversations
  );

  return results;
}

