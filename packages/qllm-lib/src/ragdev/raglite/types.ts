import { OpenAIEmbedding, BaseNode } from 'llamaindex';

export interface RAGConfig {
  /**
   * PostgreSQL database URL.
   * Example: postgresql://username:password@localhost:5432/dbname
   */
  dbUrl: string;
  llmModel: string;
  /**
   * Embedding model name.
   */
  embeddingModel: string;
  /**
   * Maximum number of tokens for the LLM model.
   */
  maxTokens?: number;
  /**
   * Temperature for the LLM model.
   */
  temperature?: number;
}

/**
 * Input document for the RAG model.
 */
export interface DocumentInput {
  content: string;
  metadata?: Record<string, any>;
  id?: string;
}

export interface QueryRequest {
  query: string;
  maxResults?: number;
  threshold?: number;
}

export interface QueryResponse {
  answer: string;
  /**
   * Sources used to generate the answer.
   */
  sources: Array<{
    /**
     * Source content.
     */
    content: string;
    /**
     * Score for the source.
     */
    score: number;
    /**
     * Optional metadata for the source.
     */
    metadata?: Record<string, any>;
  }>;
}
