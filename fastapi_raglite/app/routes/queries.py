from fastapi import APIRouter
from ..models import QueryRequest
from ..utils.raglite_utils import query_rag

router = APIRouter()

@router.post("/query")
async def query_rag_endpoint(request: QueryRequest):
    response = query_rag(request.query, request.num_chunks)
    return response
