import { z } from "zod";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import type { SupabaseDB } from "../db/supabase.js";
import type { EmbeddingService } from "../embeddings/huggingface.js";

export const SaveConversationSchema = z.object({
  title: z.string().describe("A descriptive title for the conversation"),
  content: z
    .string()
    .optional()
    .describe(
      "The full conversation content to save, including ALL code blocks, examples, and formatting"
    ),
  file_path: z
    .string()
    .optional()
    .describe(
      "Optional: Path to an exported conversation markdown file. If provided, content will be read from this file instead."
    ),
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
  auto_find_export: z
    .boolean()
    .default(true)
    .describe(
      "Automatically search for exported conversation .md files in the workspace"
    ),
});

export type SaveConversationInput = z.infer<typeof SaveConversationSchema>;

/**
 * Search for recently exported conversation markdown files in the workspace
 */
function findRecentExportedConversation(
  workspacePath: string,
  titleHint?: string
): string | null {
  try {
    const files = readdirSync(workspacePath);
    const mdFiles = files.filter(
      (f) =>
        f.startsWith("cursor_") && f.endsWith(".md") && !f.includes("jstag")
    );

    if (mdFiles.length === 0) return null;

    // Sort by modification time, most recent first
    const sortedFiles = mdFiles
      .map((f) => {
        const fullPath = join(workspacePath, f);
        return {
          path: fullPath,
          name: f,
          mtime: existsSync(fullPath)
            ? readFileSync(fullPath, "utf-8").length
            : 0,
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    // If we have a title hint, try to find a matching file
    if (titleHint) {
      const normalized = titleHint.toLowerCase().replace(/[^a-z0-9]/g, "");
      for (const file of sortedFiles) {
        const fileNormalized = file.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (fileNormalized.includes(normalized.substring(0, 20))) {
          return file.path;
        }
      }
    }

    // Return the most recently modified file
    return sortedFiles[0]?.path || null;
  } catch (error) {
    console.error("Error searching for exported files:", error);
    return null;
  }
}

/**
 * Validate that conversation content is complete
 */
function validateContent(
  content: string
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const lines = content.split("\n");

  // Check if content seems too short for a meaningful conversation
  if (lines.length < 10) {
    warnings.push(
      "Content seems very short. Make sure you're saving the complete conversation."
    );
  }

  // Check for signs of code discussion without actual code blocks
  const hasCodeReferences =
    content.includes("code") ||
    content.includes("function") ||
    content.includes("implementation");
  const hasCodeBlocks = content.includes("```");

  if (hasCodeReferences && !hasCodeBlocks) {
    warnings.push(
      "Content mentions code but contains no code blocks. The conversation may be incomplete."
    );
  }

  // Check for truncation markers
  if (content.includes("...") && content.length < 1000) {
    warnings.push("Content appears to be truncated (contains '...').");
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

export async function saveConversation(
  input: SaveConversationInput,
  db: SupabaseDB,
  embeddings: EmbeddingService,
  teamId: string,
  userId: string,
  workspacePath?: string
): Promise<{
  id: string;
  summary: string | null;
  warnings?: string[];
  source?: string;
}> {
  let content = input.content || "";
  let source = "direct";

  // Priority 1: If file_path is provided, read from that file
  if (input.file_path) {
    if (!existsSync(input.file_path)) {
      throw new Error(`File not found: ${input.file_path}`);
    }
    content = readFileSync(input.file_path, "utf-8");
    source = `file: ${input.file_path}`;
  }
  // Priority 2: Auto-find exported conversation files
  else if (input.auto_find_export && workspacePath) {
    const foundFile = findRecentExportedConversation(
      workspacePath,
      input.title
    );
    if (foundFile) {
      const autoContent = readFileSync(foundFile, "utf-8");
      // Only use auto-found file if it's substantially larger than provided content
      if (autoContent.length > content.length * 1.5) {
        content = autoContent;
        source = `auto-detected file: ${foundFile}`;
      }
    }
  }

  // Validate content completeness
  const validation = validateContent(content);
  const warnings: string[] = [...validation.warnings];

  if (!content || content.trim().length === 0) {
    throw new Error(
      "No content to save. Please provide either 'content' or 'file_path'."
    );
  }

  // Generate embedding for the conversation
  const embedding = await embeddings.generateEmbedding(
    `${input.title}\n\n${content}`
  );

  // Generate summary if requested
  let summary: string | null = null;
  if (input.generate_summary) {
    summary = await embeddings.generateSummary(content);
  }

  // Save to database
  const id = await db.saveConversation({
    user_id: userId,
    team_id: teamId,
    title: input.title,
    summary: summary ?? undefined,
    content,
    embedding,
    is_public: input.is_public,
    tags: input.tags,
    repo_context: input.repo_context,
    file_context: input.file_context,
  });

  return {
    id,
    summary,
    warnings: warnings.length > 0 ? warnings : undefined,
    source,
  };
}
