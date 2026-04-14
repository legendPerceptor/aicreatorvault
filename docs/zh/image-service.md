# AIGC Image Service

> [English](../en/image-service.md)


基于 Daft + OpenAI 的多模态图像分析服务，提供 AI 图像描述生成、语义搜索和以图搜图功能。

## 功能特性

- **AI 图像描述**: 使用 OpenAI Vision API 自动生成图片描述
- **语义搜索**: 支持自然语言搜索图片内容
- **以图搜图**: 上传图片搜索相似图片
- **向量嵌入**: 使用 OpenAI Embeddings API 生成向量表示
- **可扩展架构**: 基于 Daft 构建，支持大规模数据处理

## 快速开始

### 1. 安装 uv (Python 包管理器)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. 配置环境变量

```bash
cd image-service
cp .env.example .env
# 编辑 .env 文件，填入你的 OPENAI_API_KEY
```

### 3. 安装依赖

```bash
# 在项目根目录运行
uv sync
```

### 4. 启动服务

```bash
# 方式 1: 使用启动脚本（推荐）
chmod +x start.sh
./start.sh

# 方式 2: 分别启动各服务
# 终端 1: Node.js 后端
npm run start:backend

# 终端 2: React 前端
npm run start:frontend

# 终端 3: Python 图像服务
npm run start:image-service
```

## API 文档

### 图像分析服务 (Python - 端口 8001)

| 端点 | 方法 | 描述 |
|------|------|------|
| `/analyze` | POST | 分析图片路径，返回描述和嵌入 |
| `/analyze/upload` | POST | 上传并分析图片 |
| `/search/text` | POST | 文本语义搜索 |
| `/search/image` | POST | 以图搜图 |
| `/batch` | POST | 批量处理目录中的图片 |
| `/embedding` | POST | 生成文本嵌入向量 |
| `/health` | GET | 健康检查 |

### Node.js 后端 (端口 3001)

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/images` | GET | 获取所有图片 |
| `/api/images` | POST | 上传图片（自动 AI 分析） |
| `/api/images/:id/analyze` | POST | 重新分析图片 |
| `/api/images/search` | POST | 语义搜索图片 |
| `/api/images/search-by-image` | POST | 以图搜图 |
| `/api/images/service/status` | GET | 获取 AI 服务状态 |

## 架构

```
┌─────────────────┐
│  React Frontend │  (端口 5173)
│   SearchPage    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Node.js Backend│  (端口 3001)
│    Express      │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│ Python Service  │  (端口 8001)
│ Daft + OpenAI   │
└─────────────────┘
```

## 环境变量

### Python 服务 (.env)

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | - |
| `OPENAI_EMBEDDING_MODEL` | 嵌入模型 | text-embedding-3-small |
| `OPENAI_VISION_MODEL` | 视觉模型 | gpt-4o-mini |
| `SERVICE_PORT` | 服务端口 | 8001 |
| `NODE_BACKEND_URL` | Node.js 后端地址 | http://localhost:3001 |

## 使用示例

### 上传图片并自动分析

```bash
curl -X POST http://localhost:3001/api/images \
  -F "image=@test.jpg"
```

### 语义搜索

```bash
curl -X POST http://localhost:3001/api/images/search \
  -H "Content-Type: application/json" \
  -d '{"query": "一个穿红衣服的女孩", "topK": 10}'
```

### 以图搜图

```bash
curl -X POST http://localhost:3001/api/images/search-by-image \
  -F "image=@query.jpg" \
  -F "topK=10"
```

## 扩展性

当图片数量增长时，可以：

1. **升级向量数据库**: 将 SQLite 替换为 Pinecone、Milvus 或 Weaviate
2. **分布式处理**: Daft 支持从单机无缝扩展到集群
3. **GPU 加速**: 使用 GPU 实例加速嵌入计算
4. **缓存层**: 添加 Redis 缓存热门查询结果
