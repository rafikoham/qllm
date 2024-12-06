import { Document } from "llamaindex";

export class DocumentManager {
  private documents: Map<string, Document> = new Map();

  async addDocument(document: Document): Promise<void> {
    this.documents.set(document.id_, document);
    // Additional logic to persist document
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
    const document = this.documents.get(id);
    if (document) {
      Object.assign(document, updates);
      // Additional logic to update document
    }
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    // Additional logic to delete document
  }

  async listDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }
}
