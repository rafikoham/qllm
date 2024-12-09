import { 
  OpenAI,
  Settings,
  SimpleDirectoryReader,
  VectorStoreIndex,
  HuggingFaceEmbedding,
  OpenAIEmbedding,
  HuggingFaceEmbeddingParams
} from 'llamaindex';
import { AgentTool } from '../agent-types';
import { JSONSchemaType } from 'openai/lib/jsonschema';

interface RAGToolConfig {
  query: string;
  topK?: number;
}

export class RAGToolQueryEngine implements AgentTool {
  name: string;
  description: string;
  parameters: JSONSchemaType;
  private queryEngine: any;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(
    private directory: string,
    private config: {
      embedModel?: {
        type: 'openai' | 'huggingface';
        options: Record<string, any>;
      };
      name?: string;
      description?: string;
      similarityTopK?: number;
      cacheEnabled?: boolean;
    } = {}
  ) {
    this.name = config.name || 'rag_search_query';
    this.description = config.description || `Search through documents in ${directory} using RAG`;
    
    this.config = {
      ...config,
      embedModel: config.embedModel || {
        type: 'huggingface',
        options: {
          modelType: 'BAAI/bge-small-en-v1.5',
          quantized: false
        }
      },
      similarityTopK: config.similarityTopK || 3,
      cacheEnabled: config.cacheEnabled ?? true
    };

    this.parameters = {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant information'
        },
        topK: {
          type: 'number',
          description: 'Number of top results to return'
        }
      },
      required: ['query']
    } as JSONSchemaType;
  }

  private async initializeOnce(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initialize();
    await this.initializationPromise;
    this.initialized = true;
  }

  private async initialize(): Promise<void> {
    try {
      if (this.config.embedModel?.type === 'openai') {
        Settings.embedModel = new OpenAIEmbedding(this.config.embedModel.options);
      } else {
        const huggingFaceParams: HuggingFaceEmbeddingParams = {
          modelType: 'BAAI/bge-small-en-v1.5',
          ...this.config.embedModel?.options
        };
        Settings.embedModel = new HuggingFaceEmbedding(huggingFaceParams);
      }

      const reader = new SimpleDirectoryReader();
      const documents = await reader.loadData(this.directory);
      
      if (!documents || documents.length === 0) {
        throw new Error('No documents found in directory');
      }

      const index = await VectorStoreIndex.fromDocuments(documents);
      const retriever = await index.asRetriever({
        similarityTopK: this.config.similarityTopK
      });
      
      this.queryEngine = await index.asQueryEngine({
        retriever
      });
    } catch (error) {
      this.initialized = false;
      this.initializationPromise = null;
      throw new Error(`Failed to initialize RAG tool: ${error}`);
    }
  }

  async execute(inputs: Record<string, any>): Promise<any> {
    console.log("execute rag search called ! ")
    try {
      await this.initializeOnce();

      const response = await this.queryEngine.query({
        query: inputs.query,
        similarityTopK: inputs.topK || this.config.similarityTopK
      });

      if (!response || !response.response) {
        return {
          success: false,
          error: 'No relevant information found',
          response: null
        };
      }

      return {
        success: true,
        response: response.response,
        sources: response.sourceNodes?.map((node: any) => ({
          content: node.text,
          score: node.score || 0,
          metadata: node.metadata
        })) || []
      };
    } catch (error) {
      return {
        success: false,
        error: error,
        response: null
      };
    }
  }

  async *streamExecute(inputs: Record<string, any>): AsyncGenerator<any> {
    try {
      yield { type: 'status', message: 'Initializing RAG search...' };
      await this.initializeOnce();

      yield { type: 'status', message: 'Searching documents...' };
      const response = await this.queryEngine.query({
        query: inputs.query,
        similarityTopK: inputs.topK || this.config.similarityTopK
      });

      if (response.sourceNodes?.length > 0) {
        yield {
          type: 'sources',
          data: response.sourceNodes.map((node: any) => ({
            content: node.text,
            score: node.score || 0,
            metadata: node.metadata
          }))
        };
      }

      if (response.response) {
        yield {
          type: 'response',
          data: response.response
        };
      } else {
        yield {
          type: 'error',
          message: 'No relevant information found'
        };
      }
    } catch (error) {
      yield {
        type: 'error',
        message: error
      };
    }
  }
}