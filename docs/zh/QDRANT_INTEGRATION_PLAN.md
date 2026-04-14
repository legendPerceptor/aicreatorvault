# Qdrant 集成计划

> [English](../en/QDRANT_INTEGRATION_PLAN.md)


## 目标
在 AI 分析图片时同时写入 Qdrant，实现高效的向量检索。

## 当前架构

```
上传图片 → Backend → image-service /analyze → 返回 embedding → 存入 PostgreSQL (pgvector)
```

## 目标架构

```
上传图片 → Backend → image-service /analyze → 返回 embedding →
  ├── 存入 PostgreSQL (pgvector) ← 保留备选
  └── 存入 Qdrant ← 新增，向量检索主数据库
```

---

## 实施计划

### 阶段 1: image-service 集成 Qdrant（分析时自动写入）

**1.1 修改 image-service 分析接口**
- 文件：`image-service/main.py`
- 修改 `/analyze` 和 `/analyze/upload` 接口
- 分析完成后自动调用 Qdrant upsert
- 返回结果中包含 image_id

**1.2 定义 Qdrant Collection Schema**
- Collection 名称：`images`
- 向量维度：1536
- Payload 字段：
  - `image_id` (integer) - 图片 ID
  - `prompt_id` (integer) - 关联的提示词 ID
  - `filename` (string) - 文件名
  - `description` (string) - AI 生成的描述

### 阶段 2: 后端调用修改

**2.1 修改 backend 存储逻辑**
- 文件：`backend/routes/images.js`
- 分析完成后，同时写入 Qdrant（通过 image-service API）

**2.2 更新向量同步逻辑**
- 删除图片时同步删除 Qdrant 中的向量
- 清理机制

### 阶段 3: 检索优化

**3.1 修改检索优先级**
- 文件：`backend/services/retrievalService.js`
- 优先使用 Qdrant 搜索
- pgvector 作为降级方案

---

## 关键代码位置

| 文件 | 修改内容 |
|------|---------|
| `image-service/main.py` | 分析接口自动写入 Qdrant |
| `image-service/qdrant_client.py` | 确认 upsert 方法支持 payload |
| `backend/routes/images.js` | 分析完成后调用 Qdrant |
| `backend/services/retrievalService.js` | 检索优先级调整 |

---

## 执行顺序

1. ✅ 确认 Qdrant 服务正常运行
2. 修改 image-service 分析接口，自动写入 Qdrant
3. 修改后端调用逻辑
4. 测试完整流程
5. 调整检索逻辑

---

## 需要确认的问题

1. Qdrant 集合名称是否需要区分环境（dev/prod）？
2. 是否需要支持批量迁移现有数据到 Qdrant？
3. 删除图片时是否需要软删除（保留向量用于历史分析）？
