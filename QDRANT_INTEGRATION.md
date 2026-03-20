# Qdrant 集成测试指南

## 快速开始

### 1. 启动服务

```bash
# 启动所有服务（包括 Qdrant）
docker-compose up -d

# 或者只启动 Qdrant
docker-compose up -d qdrant
```

### 2. 验证 Qdrant 连接

```bash
# 检查 Qdrant 健康状态
curl http://localhost:8001/qdrant/health

# 预期输出：
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

### 3. 初始化集合

```bash
curl -X POST http://localhost:8001/qdrant/init
```

### 4. 迁移现有数据

```bash
# 设置环境变量
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=aicreatorvault
export DB_USER=aicreator
export DB_PASSWORD=your_password
export QDRANT_HOST=localhost
export QDRANT_PORT=6333

# 运行迁移脚本
cd /home/node/.openclaw/workspace/aicreatorvault
python scripts/migrate_to_qdrant.py
```

## API 测试

### 1. 插入单个向量

```bash
curl -X POST http://localhost:8001/qdrant/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "image_id": 1,
    "embedding": [0.1, 0.2, ...],  // 1536 维向量
    "metadata": {
      "filename": "test.jpg",
      "description": "测试图片",
      "score": 8.5
    }
  }'
```

### 2. 批量插入

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

### 3. 向量搜索

```bash
# 先生成查询向量
QUERY_VECTOR=$(curl -s "http://localhost:8001/embedding?text=美丽的风景" | jq -r '.embedding')

# 执行搜索
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

### 4. 删除向量

```bash
# 删除单个
curl -X DELETE http://localhost:8001/qdrant/delete/1

# 批量删除
curl -X POST http://localhost:8001/qdrant/batch-delete \
  -H "Content-Type: application/json" \
  -d '{"image_ids": [1, 2, 3]}'
```

## 前端集成测试

### 1. 智能搜索

在前端搜索框输入：
- "美丽的风景"（语义搜索）
- "portrait of a girl"（提示词匹配）
- "score:>8"（评分过滤）

预期行为：
1. 后端生成查询向量
2. Qdrant 返回相似图片
3. 前端显示结果（包含相似度分数）

### 2. 以图搜图

1. 上传一张图片
2. 系统分析图片生成 embedding
3. Qdrant 搜索相似图片
4. 返回结果

## 性能基准测试

### 测试脚本

```python
import time
import requests
import numpy as np

def benchmark_search(num_queries=100):
    """测试搜索性能"""
    times = []
    
    for i in range(num_queries):
        # 生成随机查询向量
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
    
    print(f"平均延迟: {np.mean(times)*1000:.2f}ms")
    print(f"P95 延迟: {np.percentile(times, 95)*1000:.2f}ms")
    print(f"P99 延迟: {np.percentile(times, 99)*1000:.2f}ms")

benchmark_search(100)
```

### 预期性能

| 图片数量 | 平均延迟 | P95 延迟 |
|---------|---------|---------|
| 1,000   | < 15ms  | < 20ms  |
| 10,000  | < 20ms  | < 30ms  |
| 100,000 | < 30ms  | < 50ms  |

## 故障排查

### Qdrant 连接失败

```bash
# 检查 Qdrant 是否运行
docker ps | grep qdrant

# 查看日志
docker logs <qdrant-container-id>

# 重启 Qdrant
docker-compose restart qdrant
```

### 搜索结果为空

1. 检查集合是否有数据：
```bash
curl http://localhost:8001/qdrant/info
```

2. 检查 embedding 是否存在：
```bash
# 连接数据库
psql -U aicreator -d aicreatorvault

# 查询有 embedding 的图片数量
SELECT COUNT(*) FROM "Images" WHERE embedding IS NOT NULL;
```

### 性能问题

1. 检查 Qdrant 索引状态：
```bash
curl http://localhost:8001/qdrant/info
```

2. 查看系统资源：
```bash
docker stats qdrant
```

## 回退方案

如果 Qdrant 不可用，系统会自动回退到内存搜索：

```javascript
// backend/services/retrievalService.js
try {
  // 尝试使用 Qdrant
  const results = await imageServiceClient.qdrantSearch(...);
} catch (error) {
  // 回退到内存搜索
  console.log('回退到内存搜索...');
  return await this.semanticSearchFallback(...);
}
```

## 监控和日志

### Qdrant Dashboard

访问：http://localhost:6333/dashboard

### 查看日志

```bash
# image-service 日志
docker logs <image-service-container-id>

# backend 日志
docker logs <backend-container-id>
```

## 下一步

- [ ] 配置生产环境的 Qdrant 集群
- [ ] 设置定期备份
- [ ] 配置监控告警
- [ ] 性能调优
