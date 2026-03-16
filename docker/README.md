# Docker 部署指南

本文档介绍如何使用 Docker Compose 部署 AI Creator Vault。

## 架构

```
┌─────────────────────────────────────────────────────┐
│                 aicreatorvault-net                  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐      │
│  │ Frontend │  │ Backend  │  │ Image Service│      │
│  │   :80    │──│  :3001   │──│    :8001     │      │
│  └──────────┘  └──────────┘  └──────────────┘      │
│       │              │              │               │
│       │    ┌─────────┼──────────────┤               │
│       │    │         │              │               │
│  ┌────▼────┴──┐  ┌───▼────┐  ┌──────▼──────┐       │
│  │  PostgreSQL│  │ Redis  │  │   Qdrant    │       │
│  │   :5432    │  │ :6379  │  │   :6333     │       │
│  └────────────┘  └────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/legendPerceptor/aicreatorvault.git
cd aicreatorvault
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入必要的配置：

```env
# 必填：数据库密码
DB_PASSWORD=your_secure_password

# 必填：OpenAI API Key
OPENAI_API_KEY=sk-xxx

# 可选：模型配置
OPENAI_VISION_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 3. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

### 4. 访问应用

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:3001/api
- **图片服务**: http://localhost:8001
- **Qdrant 控制台**: http://localhost:6333/dashboard

## 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| frontend | 5173 | React 前端 (Nginx) |
| backend | 3001 | Node.js 后端 API |
| image-service | 8001 | Python AI 图片分析服务 |
| postgres | 5432 | PostgreSQL + pgvector |
| redis | 6379 | Redis 缓存 |
| qdrant | 6333/6334 | Qdrant 向量数据库 |

## 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 重新构建
docker-compose build --no-cache

# 查看日志
docker-compose logs -f [service_name]

# 进入容器
docker-compose exec backend sh
docker-compose exec image-service bash

# 重启单个服务
docker-compose restart backend
```

## 数据持久化

数据存储在 Docker volumes 中：

- `uploads_data` - 上传的图片
- `postgres_data` - 数据库数据
- `redis_data` - Redis 数据
- `qdrant_data` - 向量数据

## 远程访问配置

### 方案 A：NAS 反向代理（推荐）

如果使用 Synology NAS：
1. 控制面板 → 应用程序 → 反向代理
2. 添加规则，将外部端口映射到 `http://localhost:5173`

### 方案 B：Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 方案 C：Tailscale/ZeroTier

直接通过 VPN 访问 NAS 内网 IP。

## 故障排查

### 服务无法启动

```bash
# 检查日志
docker-compose logs backend
docker-compose logs image-service

# 检查环境变量
docker-compose config
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker-compose exec postgres pg_isready

# 手动连接数据库
docker-compose exec postgres psql -U aicreator -d aicreatorvault
```

### 向量搜索不工作

```bash
# 检查 Qdrant 状态
curl http://localhost:6333/

# 查看 Qdrant 集合
curl http://localhost:6333/collections
```

## 生产环境建议

1. **修改默认密码**：确保 `DB_PASSWORD` 足够复杂
2. **启用 HTTPS**：使用反向代理配置 SSL
3. **限制端口暴露**：只暴露必要的端口
4. **定期备份**：备份 PostgreSQL 和 Qdrant 数据
5. **监控日志**：配置日志收集和告警

## 更新

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```
