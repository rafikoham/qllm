from pydantic import BaseModel

class DocumentUpload(BaseModel):
    filename: str

class QueryRequest(BaseModel):
    query: str
    num_chunks: int = 5
