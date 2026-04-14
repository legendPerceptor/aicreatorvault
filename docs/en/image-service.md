# AIGC Image Service

> [中文版](../zh/image-service.md)


A multimodal image analysis service based on Daft + OpenAI, providing AI image description generation, semantic search, and image-to-image search capabilities.

## Features

- **AI Image Description**: Automatically generate image descriptions using the OpenAI Vision API
- **Semantic Search**: Support natural language search for image content
- **Image-to-Image Search**: Upload an image to search for similar images
- **Vector Embeddings**: Generate vector representations using the OpenAI Embeddings API
- **Scalable Architecture**: Built on Daft, supporting large-scale data processing

## Quick Start

### 1. Install uv (Python Package Manager)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Configure Environment Variables

```bash
cd image-service
cp .env.example .env
# Edit .env file and add your OPENAI_API_KEY
```

### 3. Install Dependencies

```bash
# Run from project root
uv sync
```

### 4. Start Services

```bash
# Method 1: Use start script (recommended)
chmod +x start.sh
./start.sh

# Method 2: Start each service separately
# Terminal 1: Node.js backend
npm run start:backend

# Terminal 2: React frontend
npm run start:frontend

# Terminal 3: Python image service
npm run start:image-service
```

## API Documentation

### Image Analysis Service (Python - Port 8001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analyze` | POST | Analyze image path, return description and embedding |
| `/analyze/upload` | POST | Upload and analyze image |
| `/search/text` | POST | Text semantic search |
| `/search/image` | POST | Image-to-image search |
| `/batch` | POST | Batch process images in a directory |
| `/embedding` | POST | Generate text embedding vector |
| `/health` | GET | Health check |

### Node.js Backend (Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/images` | GET | Get all images |
| `/api/images` | POST | Upload image (auto AI analysis) |
| `/api/images/:id/analyze` | POST | Re-analyze image |
| `/api/images/search` | POST | Semantic search images |
| `/api/images/search-by-image` | POST | Image-to-image search |
| `/api/images/service/status` | GET | Get AI service status |

## Architecture

```
┌─────────────────┐
│  React Frontend │  (Port 5173)
│   SearchPage    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Node.js Backend│  (Port 3001)
│    Express      │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│ Python Service  │  (Port 8001)
│ Daft + OpenAI   │
└─────────────────┘
```

## Environment Variables

### Python Service (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | - |
| `OPENAI_EMBEDDING_MODEL` | Embedding model | text-embedding-3-small |
| `OPENAI_VISION_MODEL` | Vision model | gpt-4o-mini |
| `SERVICE_PORT` | Service port | 8001 |
| `NODE_BACKEND_URL` | Node.js backend URL | http://localhost:3001 |

## Usage Examples

### Upload Image with Auto-Analysis

```bash
curl -X POST http://localhost:3001/api/images \
  -F "image=@test.jpg"
```

### Semantic Search

```bash
curl -X POST http://localhost:3001/api/images/search \
  -H "Content-Type: application/json" \
  -d '{"query": "a girl in a red dress", "topK": 10}'
```

### Image-to-Image Search

```bash
curl -X POST http://localhost:3001/api/images/search-by-image \
  -F "image=@query.jpg" \
  -F "topK=10"
```

## Scalability

As the number of images grows, you can:

1. **Upgrade vector database**: Replace SQLite with Pinecone, Milvus, or Weaviate
2. **Distributed processing**: Daft supports seamless scaling from single machine to cluster
3. **GPU acceleration**: Use GPU instances to accelerate embedding computation
4. **Cache layer**: Add Redis to cache popular query results
