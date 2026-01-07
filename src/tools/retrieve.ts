import { z } from "zod";
import type { SupabaseDB } from "../db/supabase.js";
import type { Conversation } from "../types.js";

export const GetConversationSchema = z.object({
  id: z.string().uuid().describe("The ID of the conversation to retrieve"),
});

export type GetConversationInput = z.infer<typeof GetConversationSchema>;

export async function getConversation(
  input: GetConversationInput,
  db: SupabaseDB,
  teamId: string,
  userId: string
): Promise<Conversation | null> {
  return db.getConversation(input.id, teamId, userId);
}

export const ListConversationsSchema = z.object({
  only_mine: z
    .boolean()
    .default(false)
    .describe("Only show your own conversations"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Filter by tags"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(20)
    .describe("Maximum number of results"),
});

export type ListConversationsInput = z.infer<typeof ListConversationsSchema>;

export async function listConversations(
  input: ListConversationsInput,
  db: SupabaseDB,
  teamId: string,
  userId: string
): Promise<Conversation[]> {
  return db.listConversations(teamId, userId, {
    onlyMine: input.only_mine,
    tags: input.tags,
    limit: input.limit,
  });
}

export const DeleteConversationSchema = z.object({
  id: z.string().uuid().describe("The ID of the conversation to delete"),
});

export type DeleteConversationInput = z.infer<typeof DeleteConversationSchema>;

export async function deleteConversation(
  input: DeleteConversationInput,
  db: SupabaseDB,
  teamId: string,
  userId: string
): Promise<{ success: boolean }> {
  const success = await db.deleteConversation(input.id, userId, teamId);
  return { success };
}

export const UpdateVisibilitySchema = z.object({
  id: z.string().uuid().describe("The ID of the conversation to update"),
  is_public: z
    .boolean()
    .describe("Set to true to make public, false to make private"),
});

export type UpdateVisibilityInput = z.infer<typeof UpdateVisibilitySchema>;

export async function updateVisibility(
  input: UpdateVisibilityInput,
  db: SupabaseDB,
  teamId: string,
  userId: string
): Promise<{ success: boolean }> {
  const success = await db.updateVisibility(
    input.id,
    userId,
    teamId,
    input.is_public
  );
  return { success };
}

