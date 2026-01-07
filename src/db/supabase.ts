import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  Conversation,
  ConversationInsert,
  SearchResult,
} from "../types.js";

export class SupabaseDB {
  private client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey);
  }

  /**
   * Save a new conversation to the database
   */
  async saveConversation(conversation: ConversationInsert): Promise<string> {
    const { data, error } = await this.client
      .from("conversations")
      .insert({
        user_id: conversation.user_id,
        team_id: conversation.team_id,
        title: conversation.title,
        summary: conversation.summary || null,
        content: conversation.content,
        embedding: conversation.embedding,
        is_public: conversation.is_public,
        tags: conversation.tags || [],
        repo_context: conversation.repo_context || null,
        file_context: conversation.file_context || [],
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to save conversation: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Search for similar conversations using vector similarity
   */
  async searchSimilar(
    embedding: number[],
    teamId: string,
    userId: string,
    limit: number = 5,
    includePrivate: boolean = false
  ): Promise<SearchResult[]> {
    // Use Supabase RPC function for vector similarity search
    const { data, error } = await this.client.rpc("search_conversations", {
      query_embedding: embedding,
      team_id_filter: teamId,
      user_id_filter: userId,
      include_private: includePrivate,
      match_limit: limit,
      similarity_threshold: 0.7,
    });

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a specific conversation by ID
   */
  async getConversation(
    id: string,
    teamId: string,
    userId: string
  ): Promise<Conversation | null> {
    const { data, error } = await this.client
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("team_id", teamId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Failed to get conversation: ${error.message}`);
    }

    // Check access - must be public or owned by user
    if (!data.is_public && data.user_id !== userId) {
      return null;
    }

    return data;
  }

  /**
   * List conversations for a user
   */
  async listConversations(
    teamId: string,
    userId: string,
    options: {
      onlyMine?: boolean;
      tags?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Conversation[]> {
    let query = this.client
      .from("conversations")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(options.limit || 20);

    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 20) - 1
      );
    }

    if (options.onlyMine) {
      query = query.eq("user_id", userId);
    } else {
      // Show public conversations OR user's own private ones
      query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
    }

    if (options.tags && options.tags.length > 0) {
      query = query.contains("tags", options.tags);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list conversations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Delete a conversation (only owner can delete)
   */
  async deleteConversation(
    id: string,
    userId: string,
    teamId: string
  ): Promise<boolean> {
    const { error } = await this.client
      .from("conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .eq("team_id", teamId);

    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }

    return true;
  }

  /**
   * Update conversation visibility
   */
  async updateVisibility(
    id: string,
    userId: string,
    teamId: string,
    isPublic: boolean
  ): Promise<boolean> {
    const { error } = await this.client
      .from("conversations")
      .update({ is_public: isPublic, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("team_id", teamId);

    if (error) {
      throw new Error(`Failed to update visibility: ${error.message}`);
    }

    return true;
  }
}
