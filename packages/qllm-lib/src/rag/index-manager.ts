import { Document, VectorStoreIndex } from "llamaindex";
import { v4 as uuidv4 } from 'uuid'; // Import UUID library

export class IndexManager {
  private indexes: Map<string, VectorStoreIndex> = new Map();

  async createIndex(documents: Document[]): Promise<string> {
    const index = await VectorStoreIndex.fromDocuments(documents);
    const indexId = uuidv4(); // Generate a unique ID
    this.indexes.set(indexId, index);
    return indexId;
  }

  async updateIndex(indexId: string, documents: Document[]): Promise<void> {
    const index = this.indexes.get(indexId);
    if (index) {
      await index.insertNodes(documents);
      // Additional logic to update index
    }
  }

  async deleteIndex(indexId: string): Promise<void> {
    this.indexes.delete(indexId);
    // Additional logic to delete index
  }

  async queryIndex(indexId: string, query: string): Promise<any> {
    const index = this.indexes.get(indexId);
    if (index) {
      const queryEngine = index.asQueryEngine();
      return await queryEngine.query({ query });
    }
  }
}