import { VectorStoreIndex, QueryEngine } from "llamaindex";

export class QueryEngineManager {
  private engines: Map<string, QueryEngine> = new Map();

  createQueryEngine(index: VectorStoreIndex): QueryEngine {
    const engine = index.asQueryEngine();
    this.engines.set(index.id, engine);
    return engine;
  }

  async executeQuery(engineId: string, query: string): Promise<any> {
    const engine = this.engines.get(engineId);
    if (engine) {
      return await engine.query({ query });
    }
  }

  listEngines(): QueryEngine[] {
    return Array.from(this.engines.values());
  }
}
