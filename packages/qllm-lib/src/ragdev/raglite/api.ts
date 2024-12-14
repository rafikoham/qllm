import express, { Express, Request, Response } from 'express';
import { RAGEngine } from './rag-engine';
import { RAGConfig, DocumentInput, QueryRequest } from './types';
import bodyParser from 'body-parser';

export function createRAGApi(config: RAGConfig): Express {
  const app: Express = express();
  const ragEngine = new RAGEngine(config);

  app.use(bodyParser.json());

  // Initialize the RAG engine
  app.post('/initialize', async (_req: Request, res: Response) => {
    try {
      await ragEngine.initialize();
      res.json({ status: 'initialized' });
    } catch (err: unknown) {
      const error = err as Error;
      res.status(500).json({ error: error.message || 'Unknown error occurred' });
    }
  });

  // Add document endpoint
  app.post('/documents', async (req: Request, res: Response) => {
    try {
      const doc = req.body as DocumentInput;
      const docId = await ragEngine.addDocument(doc);
      res.json({ id: docId });
    } catch (err: unknown) {
      const error = err as Error;
      res.status(500).json({ error: error.message || 'Unknown error occurred' });
    }
  });

  // Query endpoint
  app.post('/query', async (req: Request, res: Response) => {
    try {
      const query = req.body as QueryRequest;
      const response = await ragEngine.query(query);
      res.json(response);
    } catch (err: unknown) {
      const error = err as Error;
      res.status(500).json({ error: error.message || 'Unknown error occurred' });
    }
  });

  // Streaming query endpoint
  app.post('/query/stream', async (req: Request, res: Response) => {
    try {
      const query = req.body as QueryRequest;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of ragEngine.streamQuery(query)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.end();
    } catch (err: unknown) {
      const error = err as Error;
      res.status(500).json({ error: error.message || 'Unknown error occurred' });
    }
  });

  return app;
}
