import { createRAGApi } from "./api";
import type { RAGConfig } from "./types";

async function main() {
  // Example configuration
  const config: RAGConfig = {
    dbUrl: 'postgresql://postgres:@localhost:5433/rag_quanta',
    llmModel: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-large',
    maxTokens: 1000,
    temperature: 0.7
  };

  // Create and start the API
  const app = createRAGApi(config);
  const port = 3000;

  app.listen(port, () => {
    console.log(`RAG API listening at http://localhost:${port}`);
  });

  try {
    // Initialize
    console.log('Initializing RAG...');
    const initResponse = await fetch('http://localhost:3000/initialize', { 
      method: 'POST' 
    });
    console.log('Init response:', await initResponse.text());

    // Add a document
    console.log('\nAdding document...');
    const docResponse = await fetch('http://localhost:3000/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'TypeScript is a programming language developed and maintained by Microsoft. It is a strict syntactical superset of JavaScript and adds optional static typing to the language.',
        metadata: { source: 'example' }
      })
    });
    console.log('Document added:', await docResponse.text());

    // Query
    console.log('\nQuerying...');
    const queryResponse = await fetch('http://localhost:3000/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What is TypeScript?',
        maxResults: 3
      })
    });
    console.log('Query response:', await queryResponse.text());

    // Stream query
    console.log('\nTesting streaming query...');
    const response = await fetch('http://localhost:3000/query/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Who maintains TypeScript?',
        maxResults: 3
      })
    });

    // Handle streaming response
    for await (const chunk of response.body as any) {
      console.log('Stream chunk:', new TextDecoder().decode(chunk));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
console.log('Starting RAG example...');
main().catch(console.error);
