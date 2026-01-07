import { z } from "zod";
import type { SupabaseDB } from "../db/supabase.js";
import type { EmbeddingService } from "../embeddings/huggingface.js";

export const SaveConversationSchema = z.object({
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
});

export type SaveConversationInput = z.infer<typeof SaveConversationSchema>;

export async function saveConversation(
  input: SaveConversationInput,
  db: SupabaseDB,
  embeddings: EmbeddingService,
  teamId: string,
  userId: string
): Promise<{ id: string; summary: string | null }> {
  // Generate embedding for the conversation
  const embedding = await embeddings.generateEmbedding(
    `${input.title}\n\n${input.content}`
  );

  // Generate summary if requested
  let summary: string | null = null;
  if (input.generate_summary) {
    summary = await embeddings.generateSummary(input.content);
  }

  // Save to database
  const id = await db.saveConversation({
    user_id: userId,
    team_id: teamId,
    title: input.title,
    summary: summary ?? undefined,
    content: input.content,
    embedding,
    is_public: input.is_public,
    tags: input.tags,
    repo_context: input.repo_context,
    file_context: input.file_context,
  });

  return { id, summary };
}
