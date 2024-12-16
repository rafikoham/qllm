from raglite import insert_document, create_rag_instruction, rag, retrieve_rag_context
from ..config import raglite_config


def insert_document_to_rag(file_path, config):
    """Insert a document into the RAGLite system"""
    insert_document(doc_path=file_path, config=config)


def query_rag(user_prompt: str, num_chunks: int = 5):
    """Query the RAG system with a user prompt"""
    # Retrieve relevant chunks
    chunk_spans = retrieve_rag_context(
        query=user_prompt, 
        num_chunks=num_chunks, 
        config=raglite_config
    )
    
    # Create message history with RAG instruction
    messages = []
    messages.append(create_rag_instruction(user_prompt=user_prompt, context=chunk_spans))
    
    # Stream the response
    stream = rag(messages, config=raglite_config)
    response = "".join([update for update in stream])
    
    # Return response and cited documents
    documents = [chunk_span.document for chunk_span in chunk_spans]
    return {"response": response, "documents": list(set(str(doc) for doc in documents))}
