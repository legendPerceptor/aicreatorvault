# AICreatorVault API Test Commands

> [中文版](../zh/API_TEST_COMMANDS.md)


## Basic API

### 1. Get Image List
```bash
curl -s http://localhost:3001/api/images | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Total: {len(d)} items')"
```

### 2. Get Prompt List
```bash
curl -s http://localhost:3001/api/prompts | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Total: {len(d)} items')"
```

### 3. Get Assets List
```bash
curl -s http://localhost:3001/api/assets | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Total: {len(d)} items')"
```

### 4. Get Theme List
```bash
curl -s http://localhost:3001/api/themes
```

## Knowledge Graph API

### 5. Get Graph Data
```bash
curl -s "http://localhost:3001/api/graph/data?assetTypes=prompt,image,derived_image" | python3 -m json.tool
```

### 6. Get Relationship List
```bash
curl -s http://localhost:3001/api/relationships
```

## Image Operations API

### 7. Upload Image (Auto-analyze)
```bash
curl -X POST http://localhost:3001/api/images \
  -F "image=@/path/to/image.jpg" \
  -F "prompt_id=1"
```

### 8. Upload Image (No Auto-analyze)
```bash
curl -X POST http://localhost:3001/api/images \
  -F "image=@/path/to/image.jpg" \
  -F "autoAnalyze=false"
```

### 9. Analyze Existing Image
```bash
curl -X POST http://localhost:3001/api/images/{image_id}/analyze
```

### 10. Delete Image
```bash
curl -X DELETE http://localhost:3001/api/images/{image_id}
```

## Qdrant API

### 11. Qdrant Health Check
```bash
curl -s http://localhost:8001/qdrant/health
```

### 12. Initialize Qdrant Collection
```bash
curl -X POST http://localhost:8001/qdrant/init
```

### 13. Write Vector to Qdrant
```bash
curl -X POST http://localhost:8001/qdrant/upsert \
  -H "Content-Type: application/json" \
  -d '{"image_id": 1, "embedding": [0.1, ...], "metadata": {"filename": "test.jpg"}}'
```

### 14. Delete Vector from Qdrant
```bash
curl -X DELETE http://localhost:8001/qdrant/delete/{image_id}
```

## Image Service API

### 15. Health Check
```bash
curl -s http://localhost:8001/health
```

### 16. Analyze Image
```bash
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_path": "/app/uploads/test.jpg"}'
```

## Database Operations

### 17. Clear All Data
```bash
docker exec aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault -c "
DELETE FROM \"AssetRelationships\";
DELETE FROM \"ThemeImages\";
DELETE FROM \"Assets\";
DELETE FROM \"Images\";
DELETE FROM \"Prompts\";
DELETE FROM \"Themes\";
"
```

### 18. View Data Statistics
```bash
docker exec aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault -c "
SELECT 'Assets' as tbl, COUNT(*) FROM \"Assets\"
UNION ALL SELECT 'Prompts', COUNT(*) FROM \"Prompts\"
UNION ALL SELECT 'Images', COUNT(*) FROM \"Images\"
UNION ALL SELECT 'Relationships', COUNT(*) FROM \"AssetRelationships\";
"
```

## ai-art-crawler Import

### 19. Run Import Script
```bash
cd ~/Development/ai-art-crawler
uv run python scripts/export_to_aicv.py data/crawled/civitai_*.json --url http://localhost:3001
```
