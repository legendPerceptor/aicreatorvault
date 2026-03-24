from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import tempfile
from pathlib import Path

from image_processor import ImageProcessor, BatchImageProcessor, SemanticSearch
from qdrant_utils import get_qdrant_manager
from config import get_settings

settings = get_settings()

app = FastAPI(
    title="AIGC Image Analysis Service",
    description="基于 Daft + OpenAI 的多模态图像分析服务",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    image_path: str


class AnalyzeResponse(BaseModel):
    description: str
    embedding: list[float]
    model: str


class SearchRequest(BaseModel):
    query: str
    images: list[dict]
    top_k: int = 10


class SearchResponse(BaseModel):
    results: list[dict]


class BatchRequest(BaseModel):
    directory_path: str
    extensions: Optional[list[str]] = None


class BatchPathsRequest(BaseModel):
    image_paths: list[str]


class BatchResponse(BaseModel):
    results: list[dict]


@app.get("/")
async def root():
    return {
        "service": "AIGC Image Analysis Service",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_image(request: AnalyzeRequest):
    if not os.path.exists(request.image_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    try:
        processor = ImageProcessor()
        result = processor.process_single_image(request.image_path)
        return AnalyzeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/upload", response_model=AnalyzeResponse)
async def analyze_uploaded_image(file: UploadFile = File(...)):
    tmp_path = None
    try:
        suffix = Path(file.filename).suffix if file.filename else ""
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        processor = ImageProcessor()
        result = processor.process_single_image(tmp_path)

        os.unlink(tmp_path)
        return AnalyzeResponse(**result)
    except Exception as e:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/text", response_model=SearchResponse)
async def search_by_text(request: SearchRequest):
    try:
        searcher = SemanticSearch()
        results = searcher.search_by_text(request.query, request.images, request.top_k)
        return SearchResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/image", response_model=SearchResponse)
async def search_by_image(
    file: UploadFile = File(...), images: str = Form(...), top_k: int = Form(10)
):
    import json

    tmp_path = None
    try:
        suffix = Path(file.filename).suffix if file.filename else ""
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        images_list = json.loads(images)
        searcher = SemanticSearch()
        results = searcher.search_by_image(tmp_path, images_list, top_k)

        os.unlink(tmp_path)
        return SearchResponse(results=results)
    except Exception as e:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch", response_model=BatchResponse)
async def batch_process(request: BatchRequest):
    if not os.path.exists(request.directory_path):
        raise HTTPException(status_code=404, detail="Directory not found")

    try:
        processor = BatchImageProcessor()
        results = processor.process_directory(
            request.directory_path, request.extensions or []
        )
        return BatchResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-paths", response_model=BatchResponse)
async def batch_process_paths(request: BatchPathsRequest):
    try:
        processor = BatchImageProcessor()
        results = processor.process_paths(request.image_paths)
        return BatchResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embedding")
async def generate_embedding(text: str):
    try:
        processor = ImageProcessor()
        embedding = processor.generate_embedding(text)
        return {"embedding": embedding, "model": settings.openai_embedding_model}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Qdrant 向量搜索 API =============


class QdrantUpsertRequest(BaseModel):
    image_id: int
    embedding: list[float]
    metadata: Optional[dict] = None


class QdrantSearchRequest(BaseModel):
    query_vector: list[float]
    top_k: int = 20
    filters: Optional[dict] = None


class QdrantBatchUpsertRequest(BaseModel):
    points: list[dict]  # [{id, embedding, metadata}]


class QdrantBatchDeleteRequest(BaseModel):
    image_ids: list[int]


@app.get("/qdrant/health")
async def qdrant_health_check():
    """检查 Qdrant 连接状态"""
    try:
        qdrant = get_qdrant_manager()
        is_healthy = qdrant.health_check()

        if is_healthy:
            info = qdrant.get_collection_info()
            return {"status": "healthy", "connected": True, "collection": info}
        else:
            return {
                "status": "unhealthy",
                "connected": False,
                "error": "无法连接到 Qdrant",
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/qdrant/init")
async def qdrant_init_collection():
    """初始化 Qdrant 集合"""
    try:
        qdrant = get_qdrant_manager()
        success = qdrant.init_collection()

        if success:
            return {"status": "success", "message": "集合初始化完成"}
        else:
            raise HTTPException(status_code=500, detail="集合初始化失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/qdrant/upsert")
async def qdrant_upsert_vector(request: QdrantUpsertRequest):
    """插入或更新单个图片向量"""
    try:
        qdrant = get_qdrant_manager()
        success = qdrant.upsert_image(
            image_id=request.image_id,
            embedding=request.embedding,
            metadata=request.metadata,
        )

        if success:
            return {"status": "success", "image_id": request.image_id}
        else:
            raise HTTPException(status_code=500, detail="向量插入失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/qdrant/batch-upsert")
async def qdrant_batch_upsert(request: QdrantBatchUpsertRequest):
    """批量插入向量"""
    try:
        qdrant = get_qdrant_manager()
        success = qdrant.batch_upsert(request.points)

        if success:
            return {"status": "success", "count": len(request.points)}
        else:
            raise HTTPException(status_code=500, detail="批量插入失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/qdrant/search")
async def qdrant_search_vectors(request: QdrantSearchRequest):
    """使用 Qdrant 进行向量搜索"""
    try:
        qdrant = get_qdrant_manager()
        results = qdrant.search(
            query_vector=request.query_vector,
            top_k=request.top_k,
            filters=request.filters,
        )

        return {"status": "success", "results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/qdrant/delete/{image_id}")
async def qdrant_delete_vector(image_id: int):
    """删除单个图片向量"""
    try:
        qdrant = get_qdrant_manager()
        success = qdrant.delete_image(image_id)

        if success:
            return {"status": "success", "image_id": image_id}
        else:
            raise HTTPException(status_code=500, detail="向量删除失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/qdrant/batch-delete")
async def qdrant_batch_delete(request: QdrantBatchDeleteRequest):
    """批量删除向量"""
    try:
        qdrant = get_qdrant_manager()
        success = qdrant.batch_delete(request.image_ids)

        if success:
            return {"status": "success", "count": len(request.image_ids)}
        else:
            raise HTTPException(status_code=500, detail="批量删除失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/qdrant/info")
async def qdrant_get_info():
    """获取 Qdrant 集合信息"""
    try:
        qdrant = get_qdrant_manager()
        info = qdrant.get_collection_info()

        if info:
            return {"status": "success", "info": info}
        else:
            raise HTTPException(status_code=500, detail="获取集合信息失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def run_server():
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=settings.service_port)


if __name__ == "__main__":
    run_server()
