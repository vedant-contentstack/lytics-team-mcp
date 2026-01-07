import { HfInference } from "@huggingface/inference";

export class EmbeddingService {
  private client: HfInference;
  // Using BGE model - works with feature extraction API, produces 384-dim embeddings
  private embeddingModel = "BAAI/bge-small-en-v1.5";
  // Using BART for summarization - free tier available
  private summaryModel = "facebook/bart-large-cnn";

  constructor(apiKey: string) {
    this.client = new HfInference(apiKey);
  }

  /**
   * Generate embedding for a text string
   * Returns 384-dimensional vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Truncate if too long (model has ~512 token limit)
    const truncatedText = text.slice(0, 2000);

    const result = await this.client.featureExtraction({
      model: this.embeddingModel,
      inputs: truncatedText,
    });

    // Handle different result formats
    // Could be number[] or number[][] depending on model
    if (Array.isArray(result)) {
      if (Array.isArray(result[0])) {
        // Nested array - take first element or mean pool
        if (Array.isArray(result[0][0])) {
          // 3D array (batch, seq, hidden) - mean pool over sequence dimension
          const embeddings = result[0] as number[][];
          const pooled = new Array(embeddings[0].length).fill(0);
          for (const token of embeddings) {
            for (let i = 0; i < token.length; i++) {
              pooled[i] += token[i];
            }
          }
          return pooled.map((v) => v / embeddings.length);
        }
        return result[0] as number[];
      }
      return result as number[];
    }

    throw new Error("Unexpected embedding format from API");
  }

  /**
   * Generate a summary of the conversation for better searchability
   */
  async generateSummary(content: string): Promise<string> {
    try {
      // Truncate content for summarization
      const truncatedContent = content.slice(0, 3000);

      const result = await this.client.summarization({
        model: this.summaryModel,
        inputs: truncatedContent,
        parameters: {
          max_length: 150,
          min_length: 30,
        },
      });

      return result.summary_text;
    } catch (error) {
      // If summarization fails (rate limit, etc), create a simple excerpt
      console.error("Summary generation failed, using excerpt:", error);
      return content.slice(0, 200) + "...";
    }
  }
}
