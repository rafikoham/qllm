from pathlib import Path
from raglite import RAGLiteConfig, insert_document, create_rag_instruction, rag, retrieve_rag_context
from rerankers import Reranker

# Configure RAGLite with SQLite and local models
my_config = RAGLiteConfig(
    db_url="sqlite:///raglite.sqlite",
    llm="llama-cpp-python/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/*Q4_K_M.gguf@8192",
    embedder="llama-cpp-python/lm-kit/bge-m3-gguf/*F16.gguf@1024",

)

def insert_documents():
    """Insert sample documents into the RAG system"""
    # Replace these paths with your actual document paths
    documents = [
        "POC Market.pdf",
    ]
    
    for doc in documents:
        if Path(doc).exists():
            print(f"Inserting document: {doc}")
            insert_document(Path(doc), config=my_config)
        else:
            print(f"Warning: Document not found: {doc}")

def query_rag(user_prompt: str, num_chunks: int = 5):
    """Query the RAG system with a user prompt"""
    print(f"\nQuerying: {user_prompt}")
    
    # Retrieve relevant chunks
    chunk_spans = retrieve_rag_context(
        query=user_prompt, 
        num_chunks=num_chunks, 
        config=my_config
    )
    
    # Create message history with RAG instruction
    messages = []
    messages.append(create_rag_instruction(user_prompt=user_prompt, context=chunk_spans))
    
    # Stream the response
    print("\nResponse:")
    stream = rag(messages, config=my_config)
    for update in stream:
        print(update, end="")
    
    # Print cited documents
    print("\n\nCited Documents:")
    documents = [chunk_span.document for chunk_span in chunk_spans]
    for doc in set(documents):
        print(f"- {doc}")

if __name__ == "__main__":
    # First, insert documents
    insert_documents()
    
    # Then, make some queries
    sample_queries = [
        "How is intelligence measured?",
        "What are the key concepts of special relativity?",
    ]
    
    for query in sample_queries:
        query_rag(query)
        print("\n" + "="*50 + "\n")
