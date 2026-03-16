# AI 检索系统设计文档

## 概述

AI Creator Vault 的检索系统采用多层次、多模态的检索架构，提供灵活的搜索方式和精准的结果排序。

## 检索模式

### 1. 关键词搜索
- **适用场景**: 快速查找特定内容
- **搜索范围**: 图片描述、提示词内容、文件名
- **特点**: 快速、精确匹配

### 2. AI 语义搜索
- **适用场景**: 自然语言描述搜索
- **技术**: OpenAI text-embedding-3-small 向量模型
- **特点**: 理解语义，找到概念相似的内容

### 3. 以图搜图
- **适用场景**: 根据参考图片找相似图片
- **技术**: CLIP 图像嵌入
- **特点**: 视觉相似度匹配

### 4. 混合检索 ⭐
- **适用场景**: 获得最佳搜索结果
- **技术**: 关键词 + 语义检索融合
- **特点**:
  - 结合关键词匹配和语义理解
  - 使用 RRF (Reciprocal Rank Fusion) 算法融合结果
  - 智能重排序，考虑评分、日期等因素

## 核心算法

### Reciprocal Rank Fusion (RRF)

RRF 算法用于融合多个排序结果列表：

```
score(d) = Σ (α / (k + rank(d)))

其中:
- d: 文档
- k: 常数 (通常为60)
- rank(d): 文档在特定列表中的排名
- α: 权重因子
```

**优点**:
- 无需归一化分数
- 对异常值鲁棒
- 可调整不同检索方法的权重

### 结果重排序

综合多个因素对结果进行重排序：

```
finalScore = α·similarity + β·(score/10) + γ·dateScore

其中:
- similarity: 语义相似度 (0-1)
- score: 用户评分 (0-10)
- dateScore: 新鲜度分数 (0-1)
- α, β, γ: 可配置权重
```

默认权重:
- 相似度权重: 0.7
- 评分权重: 0.2
- 日期权重: 0.1

## API 端点

### 混合检索
```http
POST /api/images/search/hybrid
Content-Type: application/json

{
  "query": "红色连衣裙 女孩",
  "topK": 20,
  "alpha": 0.7,
  "minScore": 5,
  "maxScore": 10,
  "minSimilarity": 0.6,
  "themeIds": [1, 2, 3]
}
```

**响应示例**:
```json
{
  "query": "红色连衣裙 女孩",
  "originalQuery": "红色连衣裙 女孩",
  "totalResults": 15,
  "results": [
    {
      "id": 123,
      "filename": "image.jpg",
      "similarity": 0.85,
      "rerankScore": 0.82,
      "score": 8,
      "matchReasons": [
        "高度相似的内容",
        "包含关键词: 红色",
        "高评分内容"
      ]
    }
  ]
}
```

### 查询扩展
```http
POST /api/images/search/expand
Content-Type: application/json

{
  "query": "女孩"
}
```

**响应示例**:
```json
{
  "originalQuery": "女孩",
  "optimizedQuery": "女孩",
  "expandedQueries": [
    "女孩",
    "女性",
    "女子",
    "少女"
  ]
}
```

### 搜索建议
```http
GET /api/images/search/suggestions?q=红

{
  "suggestions": [
    "红色",
    "红色连衣裙",
    "红色背景"
  ]
}
```

## 匹配原因生成

系统会自动分析匹配结果，生成匹配原因说明：

### 生成规则

1. **相似度原因**:
   - ≥ 0.8: "高度相似的内容"
   - ≥ 0.6: "相似的视觉风格"

2. **关键词匹配**:
   - 从描述中提取匹配的关键词
   - 显示前2个匹配词

3. **提示词匹配**:
   - 提示词包含查询内容

4. **评分原因**:
   - ≥ 8分: "高评分内容"

5. **文件名匹配**:
   - 文件名包含查询词

## 使用示例

### 前端使用

```javascript
// 混合检索
const response = await fetch('/api/images/search/hybrid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '穿着红色连衣裙的女孩在公园',
    topK: 20,
    alpha: 0.7,  // 70% 语义搜索，30% 关键词搜索
  }),
});

const data = await response.json();
console.log(data.results); // 包含 matchReasons 的结果列表
```

### 后端直接调用

```javascript
const retrievalService = require('./services/retrievalService');

// 执行混合检索
const results = await retrievalService.hybridSearch(
  '穿着红色连衣裙的女孩',
  {
    topK: 20,
    alpha: 0.7,
    minScore: 5,
  }
);

// 结果包含相似度、重排序分数和匹配原因
results.forEach(item => {
  console.log(item.id, item.similarity, item.matchReasons);
});
```

## 性能优化建议

### 1. 向量索引
- PostgreSQL: 使用 pgvector 的 HNSW 索引
- SQLite: 考虑使用 sqlite-vss 扩展

### 2. 缓存策略
- 缓存热门查询的结果
- 缓存查询扩展结果
- 使用 Redis 缓存向量相似度计算结果

### 3. 批量处理
- 批量生成向量嵌入
- 异步处理大规模检索

### 4. 查询优化
- 使用查询扩展提高召回率
- 设置合理的 topK 值
- 应用过滤器减少候选集

## 配置参数

### 检索服务配置

```javascript
// backend/services/retrievalService.js

const defaultConfig = {
  // RRF 参数
  rffConstant: 60,

  // 重排序权重
  weights: {
    similarity: 0.7,
    score: 0.2,
    date: 0.1,
  },

  // 默认 topK
  defaultTopK: 20,

  // 相似度阈值
  minSimilarity: 0.5,
};
```

### 环境变量

```env
# OpenAI 配置
OPENAI_API_KEY=sk-xxx
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# 检索配置
DEFAULT_TOP_K=20
DEFAULT_ALPHA=0.7
MIN_SIMILARITY=0.5
```

## 未来扩展

### 1. 高级功能
- [ ] 查询意图分类
- [ ] 多模态融合（文本+图片）
- [ ] 个性化检索（基于用户历史）
- [ ] 时序检索（追踪创作演化）

### 2. 性能提升
- [ ] 向量量化和近似搜索
- [ ] 分布式检索
- [ ] GPU 加速

### 3. 智能增强
- [ ] 自动查询重写
- [ ] 结果多样性优化
- [ ] 主动学习（用户反馈优化）

## 故障排查

### 问题: 语义搜索无结果
**解决方案**:
1. 检查图片是否已分析（有 embedding）
2. 确认 AI 服务运行正常
3. 查看后端日志

### 问题: 混合检索结果不理想
**解决方案**:
1. 调整 alpha 参数（语义/关键词权重）
2. 检查查询是否经过优化
3. 尝试使用查询扩展

### 问题: 相似度计算慢
**解决方案**:
1. 使用 pgvector 加速
2. 减少 topK 值
3. 应用预过滤器

## 参考资料

- [Reciprocal Rank Fusion](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- [Text Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [pgvector](https://github.com/pgvector/pgvector)
