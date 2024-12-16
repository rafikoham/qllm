from raglite import RAGLiteConfig
from rerankers import Reranker

# Configuration for RAGLite
raglite_config = RAGLiteConfig(
    db_url="sqlite:///raglite.sqlite",
    llm="llama-cpp-python/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/*Q4_K_M.gguf@8192",
    embedder="llama-cpp-python/lm-kit/bge-m3-gguf/*F16.gguf@1024"
)
