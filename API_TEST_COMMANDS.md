# AICreatorVault API 测试命令

## 基础 API

### 1. 获取图片列表
```bash
curl -s http://localhost:3001/api/images | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'共 {len(d)} 条')"
```

### 2. 获取提示词列表
```bash
curl -s http://localhost:3001/api/prompts | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'共 {len(d)} 条')"
```

### 3. 获取 Assets 列表
```bash
curl -s http://localhost:3001/api/assets | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'共 {len(d)} 条')"
```

### 4. 获取主题列表
```bash
curl -s http://localhost:3001/api/themes
```

## 知识图谱 API

### 5. 获取图谱数据
```bash
curl -s "http://localhost:3001/api/graph/data?assetTypes=prompt,image,derived_image" | python3 -m json.tool
```

### 6. 获取关系列表
```bash
curl -s http://localhost:3001/api/relationships
```

## 图片操作 API

### 7. 上传图片（自动分析）
```bash
curl -X POST http://localhost:3001/api/images \
  -F "image=@/path/to/image.jpg" \
  -F "prompt_id=1"
```

### 8. 上传图片（不自动分析）
```bash
curl -X POST http://localhost:3001/api/images \
  -F "image=@/path/to/image.jpg" \
  -F "autoAnalyze=false"
```

### 9. 分析已有图片
```bash
curl -X POST http://localhost:3001/api/images/{image_id}/analyze
```

### 10. 删除图片
```bash
curl -X DELETE http://localhost:3001/api/images/{image_id}
```

## Qdrant API

### 11. Qdrant 健康检查
```bash
curl -s http://localhost:8001/qdrant/health
```

### 12. 初始化 Qdrant 集合
```bash
curl -X POST http://localhost:8001/qdrant/init
```

### 13. 写入向量到 Qdrant
```bash
curl -X POST http://localhost:8001/qdrant/upsert \
  -H "Content-Type: application/json" \
  -d '{"image_id": 1, "embedding": [0.1, ...], "metadata": {"filename": "test.jpg"}}'
```

### 14. 从 Qdrant 删除向量
```bash
curl -X DELETE http://localhost:8001/qdrant/delete/{image_id}
```

## image-service API

### 15. 健康检查
```bash
curl -s http://localhost:8001/health
```

### 16. 分析图片
```bash
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_path": "/app/uploads/test.jpg"}'
```

## 数据库操作

### 17. 清空所有数据
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

### 18. 查看数据统计
```bash
docker exec aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault -c "
SELECT 'Assets' as tbl, COUNT(*) FROM \"Assets\"
UNION ALL SELECT 'Prompts', COUNT(*) FROM \"Prompts\"
UNION ALL SELECT 'Images', COUNT(*) FROM \"Images\"
UNION ALL SELECT 'Relationships', COUNT(*) FROM \"AssetRelationships\";
"
```

## ai-art-crawler 导入

### 19. 运行导入脚本
```bash
cd ~/Development/ai-art-crawler
uv run python scripts/export_to_aicv.py data/crawled/civitai_*.json --url http://localhost:3001
```
