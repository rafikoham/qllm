import { 
  VectorStoreIndex, 
  Document, 
  OpenAIEmbedding,
  SimpleNodeParser,
  OpenAI,
  serviceContextFromDefaults,
  NodeWithScore,
  MetadataMode
} from 'llamaindex';
import { RAGConfig, DocumentInput, QueryRequest, QueryResponse } from './types.js';
import { Pool } from 'pg';

export class RAGEngine {
  private pool: Pool | null = null;
  private index: VectorStoreIndex | null = null;
  private embedModel: OpenAIEmbedding | null = null;
  private llm: OpenAI | null = null;

  constructor(private config: RAGConfig) {}

  async initialize(): Promise<void> {
    // Initialize PostgreSQL connection
    if (this.config.dbUrl.startsWith('postgresql:')) {
      this.pool = new Pool({
        user: 'postgres',
        host: '127.0.0.1',
        database: 'rag',
        port: 5433,
        ssl: false,
        password: 'adonis2000'
      });

      try {
        // Create tables if they don't exist
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            content TEXT,
            metadata JSONB,
            embedding TEXT
          )
        `);
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
      }
    }

    // Initialize LlamaIndex components
    this.embedModel = new OpenAIEmbedding({
      model: this.config.embeddingModel
    });

    this.llm = new OpenAI({ 
      model: this.config.llmModel,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    });

    const serviceContext = await serviceContextFromDefaults({
      llm: this.llm,
      embedModel: this.embedModel
    });

    this.index = await VectorStoreIndex.fromDocuments(
      [], // Start with empty index
      { serviceContext }
    );
  }

  async addDocument(doc: DocumentInput): Promise<string> {
    if (!this.index || !this.pool) {
      throw new Error('RAGEngine not initialized');
    }

    const document = new Document({
      text: doc.content,
      metadata: doc.metadata
    });

    // Parse document into nodes
    const parser = new SimpleNodeParser();
    const nodes = await parser.getNodesFromDocuments([document]);

    // Add to index
    await this.index.insertNodes(nodes);

    // Store in PostgreSQL
    const docId = doc.id || Math.random().toString(36).substring(7);
    await this.pool.query(
      'INSERT INTO documents (id, content, metadata) VALUES ($1, $2, $3)',
      [docId, doc.content, JSON.stringify(doc.metadata)]
    );

    return docId;
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    if (!this.index) {
      throw new Error('RAGEngine not initialized');
    }

    const queryEngine = this.index.asQueryEngine();
    const response = await queryEngine.query({
      query: request.query,
    });

    return {
      answer: response.response,
      sources: (response.sourceNodes || []).map((node: NodeWithScore) => ({
        content: node.node?.getContent(MetadataMode.NONE) || '',
        score: node.score || 0,
        metadata: node.node?.metadata
      }))
    };
  }

  async *streamQuery(request: QueryRequest): AsyncGenerator<Partial<QueryResponse>> {
    if (!this.index) {
      throw new Error('RAGEngine not initialized');
    }

    const queryEngine = this.index.asQueryEngine();
    const response = await queryEngine.query({
      query: request.query,
    });

    // First yield the sources
    yield {
      sources: (response.sourceNodes || []).map((node: NodeWithScore) => ({
        content: node.node?.getContent(MetadataMode.NONE) || '',
        score: node.score || 0,
        metadata: node.node?.metadata
      }))
    };

    // Then yield the answer
    yield {
      answer: response.response
    };
  }

  async cleanup(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}