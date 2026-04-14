# Qdrant Integration Test Guide

> [中文版](../zh/QDRANT_INTEGRATION.md)


## Quick Start

### 1. Start Services

```bash
# Start all services (including Qdrant)
docker-compose up -d

# Or start Qdrant only
docker-compose up -d qdrant
```

### 2. Verify Qdrant Connection

```bash
# Check Qdrant health status
curl http://localhost:8001/qdrant/health

# Expected output:
# {
#   "status": "healthy",
#   "connected": true,
#   "collection": {
#     "points_count": 0,
#     "vectors_count": 0,
#     "status": "green",
#     "config": {
#       "vector_size": 1536,
#       "distance": "Cosine"
#     }
#   }
# }
```

### 3. Initialize Collection

```bash
curl -X POST http://localhost:8001/qdrant/init
```

### 4. Migrate Existing Data

```bash
# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=aicreatorvault
export DB_USER=aicreator
export DB_PASSWORD=your_password
export QDRANT_HOST=localhost
export QDRANT_PORT=6333

# Run migration script
cd /home/node/.openclaw/workspace/aicreatorvault
python scripts/migrate_to_qdrant.py
```

## API Testing

### 1. Insert a Single Vector

```bash
curl -X POST http://localhost:8001/qdrant/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "image_id": 1,
    "embedding": [0.1, 0.2, ...],  // 1536-dimensional vector
    "metadata": {
      "filename": "test.jpg",
      "description": "test image",
      "score": 8.5
    }
  }'
```

### 2. Batch Insert

```bash
curl -X POST http://localhost:8001/qdrant/batch-upsert \
  -H "Content-Type: application/json" \
  -d '{
    "points": [
      {
        "id": 1,
        "embedding": [0.1, 0.2, ...],
        "metadata": {"filename": "image1.jpg"}
      },
      {
        "id": 2,
        "embedding": [0.3, 0.4, ...],
        "metadata": {"filename": "image2.jpg"}
      }
    ]
  }'
```

### 3. Vector Search

```bash
# First generate a query vector
QUERY_VECTOR=$(curl -s "http://localhost:8001/embedding?text=beautiful landscape" | jq -r '.embedding')

# Execute search
curl -X POST http://localhost:8001/qdrant/search \
  -H "Content-Type: application/json" \
  -d "{
    \"query_vector\": $QUERY_VECTOR,
    \"top_k\": 10,
    \"filters\": {
      \"min_score\": 5.0,
      \"max_score\": 10.0
    }
  }"
```

### 4. Delete Vectors

```bash
# Delete single
curl -X DELETE http://localhost:8001/qdrant/delete/1

# Batch delete
curl -X POST http://localhost:8001/qdrant/batch-delete \
  -H "Content-Type: application/json" \
  -d '{"image_ids": [1, 2, 3]}'
```

## Frontend Integration Testing

### 1. Smart Search

Enter in the frontend search box:
- "beautiful landscape" (semantic search)
- "portrait of a girl" (prompt matching)
- "score:>8" (score filtering)

Expected behavior:
1. Backend generates query vector
2. Qdrant returns similar images
3. Frontend displays results (with similarity scores)

### 2. Image-to-Image Search

1. Upload an image
2. System analyzes image to generate embedding
3. Qdrant searches for similar images
4. Return results

## Performance Benchmark Testing

### Test Script

```python
import time
import requests
import numpy as np

def benchmark_search(num_queries=100):
    """Test search performance"""
    times = []

    for i in range(num_queries):
        # Generate random query vector
        query_vector = np.random.rand(1536).tolist()

        start = time.time()
        response = requests.post(
            'http://localhost:8001/qdrant/search',
            json={
                'query_vector': query_vector,
                'top_k': 20
            }
        )
        elapsed = time.time() - start
        times.append(elapsed)

    print(f"Average latency: {np.mean(times)*1000:.2f}ms")
    print(f"P95 latency: {np.percentile(times, 95)*1000:.2f}ms")
    print(f"P99 latency: {np.percentile(times, 99)*1000:.2f}ms")

benchmark_search(100)
```

### Expected Performance

| Number of Images | Average Latency | P95 Latency |
|-----------------|-----------------|-------------|
| 1,000           | < 15ms          | < 20ms      |
| 10,000          | < 20ms          | < 30ms      |
| 100,000         | < 30ms          | < 50ms      |

## Troubleshooting

### Qdrant Connection Failed

```bash
# Check if Qdrant is running
docker ps | grep qdrant

# View logs
docker logs <qdrant-container-id>

# Restart Qdrant
docker-compose restart qdrant
```

### Empty Search Results

1. Check if collection has data:
```bash
curl http://localhost:8001/qdrant/info
```

2. Check if embeddings exist:
```bash
# Connect to database
psql -U aicreator -d aicreatorvault

# Query count of images with embeddings
SELECT COUNT(*) FROM "Images" WHERE embedding IS NOT NULL;
```

### Performance Issues

1. Check Qdrant index status:
```bash
curl http://localhost:8001/qdrant/info
```

2. View system resources:
```bash
docker stats qdrant
```

## Fallback Plan

If Qdrant is unavailable, the system automatically falls back to in-memory search:

```javascript
// backend/services/retrievalService.js
try {
  // Try using Qdrant
  const results = await imageServiceClient.qdrantSearch(...);
} catch (error) {
  // Fall back to in-memory search
  console.log('Falling back to in-memory search...');
  return await this.semanticSearchFallback(...);
}
```

## Monitoring and Logging

### Qdrant Dashboard

Access: http://localhost:6333/dashboard

### View Logs

```bash
# image-service logs
docker logs <image-service-container-id>

# backend logs
docker logs <backend-container-id>
```

## Next Steps

- [ ] Configure Qdrant cluster for production
- [ ] Set up regular backups
- [ ] Configure monitoring alerts
- [ ] Performance tuning
