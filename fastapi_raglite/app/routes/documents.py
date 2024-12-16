from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
from ..utils.raglite_utils import insert_document
from ..config import raglite_config

router = APIRouter()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename must not be empty")
        file_path = Path(file.filename)
        with file_path.open("wb") as buffer:
            buffer.write(file.file.read())
        insert_document(file_path, config=raglite_config)
        return {"filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
