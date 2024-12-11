import {
  LlamaParseReader,
  VectorStoreIndex,
  Document,
  OpenAIEmbedding,
} from "llamaindex";
import { AgentTool } from "../agent-types";
import { JSONSchemaType } from "openai/lib/jsonschema";

interface LlamaAgentConfig {
  filePath: string;
  resultType?: "markdown" | "text";
  query?: string;
}

export class LlamaAgent implements AgentTool {
  name: string;
  description: string;
  parameters: JSONSchemaType;
  private index: VectorStoreIndex | null = null;
  private documents: Document[] = [];

  constructor(private config: LlamaAgentConfig) {
    this.name = "llama_parse";
    this.description = "Parse and query documents using LlamaParse";
    this.parameters = {
      type: "object",
      properties: {
        query: { type: "string" },
        filePath: { type: "string" },
        resultType: { type: "string", enum: ["markdown", "text"] }
      },
      required: ["query", "filePath"]
    };
  }

  async initialize() {
    try {
      const reader = new LlamaParseReader({ 
        resultType: this.config.resultType || "markdown" 
      });

      this.documents = await reader.loadData(this.config.filePath);
      this.index = await VectorStoreIndex.fromDocuments(this.documents);
      
      return true;
    } catch (error) {
      console.error("Failed to initialize LlamaAgent:", error);
      return false;
    }
  }

  async execute(inputs: Record<string, any>) {
    if (!this.index) {
      await this.initialize();
    }

    if (!this.index) {
      throw new Error("Failed to initialize index");
    }

    const queryEngine = this.index.asQueryEngine();
    const { response, sourceNodes } = await queryEngine.query({
      query: inputs.query || this.config.query || "Summarize the document",
    });

    return {
      response,
      sources: sourceNodes.map(node => ({
        text: node.text,
        score: node.score
      }))
    };
  }

  async streamExecute(inputs: Record<string, any>): AsyncGenerator<any> {
    const result = await this.execute(inputs);
    yield result;
  }
}
