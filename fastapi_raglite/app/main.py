from fastapi import FastAPI
from .routes import documents, queries

app = FastAPI()

# Include routes
app.include_router(documents.router, prefix="/documents")
app.include_router(queries.router, prefix="/queries")

@app.get("/")
async def root():
    return {"message": "Welcome to the FastAPI RAGLite application!"}
