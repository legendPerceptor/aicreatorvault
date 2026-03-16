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

# 必填：上传文件存储路径（宿主机目录）
# NAS 部署建议使用绝对路径，例如：
# Synology: /volume1/docker/aicreatorvault/uploads
# 群晖: /volume1/docker/aicreatorvault/uploads
# 本地开发: ./uploads
UPLOADS_PATH=./uploads

# 可选：模型配置
OPENAI_VISION_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**⚠️ 重要：上传目录配置**

上传的图片通过 bind mount 存储在宿主机上，便于：
- 直接在 NAS 文件管理器中查看
- 使用 NAS 自带的备份功能
- 迁移数据时直接复制目录

确保目录存在：
```bash
# 创建上传目录（根据你的 UPLOADS_PATH）
mkdir -p /volume1/docker/aicreatorvault/uploads

# 设置权限（如果遇到权限问题）
chmod 755 /volume1/docker/aicreatorvault/uploads
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

- **前端**: http://your-nas-ip:5173
- **后端 API**: http://your-nas-ip:3001/api
- **图片服务**: http://your-nas-ip:8001
- **Qdrant 控制台**: http://your-nas-ip:6333/dashboard

## 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| frontend | 5173 | React 前端 (Nginx) |
| backend | 3001 | Node.js 后端 API |
| image-service | 8001 | Python AI 图片分析服务 |
| postgres | 5432 | PostgreSQL + pgvector |
| redis | 6379 | Redis 缓存 |
| qdrant | 6333/6334 | Qdrant 向量数据库 |

## 数据存储说明

| 数据类型 | 存储方式 | 位置 |
|---------|---------|------|
| 上传的图片 | Bind Mount | `UPLOADS_PATH` (宿主机目录) |
| 数据库数据 | Named Volume | Docker 管理的 `postgres_data` |
| Redis 缓存 | Named Volume | Docker 管理的 `redis_data` |
| 向量数据 | Named Volume | Docker 管理的 `qdrant_data` |

**为什么上传文件用 Bind Mount？**
- 可以在 NAS 文件管理器中直接查看
- 便于使用 NAS 的备份功能
- 迁移时只需复制目录

## 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 停止并删除数据卷（⚠️ 会删除数据库数据）
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

## 远程访问配置

### 方案 A：NAS 反向代理（推荐）

**Synology 群晖：**
1. 控制面板 → 登录门户 → 高级 → 反向代理
2. 添加规则：
   - 来源：`https://your-domain.com` (或自定义端口)
   - 目的地：`http://localhost:5173`

### 方案 B：Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API (可选，如果需要单独暴露)
    location /api {
        proxy_pass http://localhost:3001;
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

### 上传文件权限问题

```bash
# 检查上传目录权限
ls -la /volume1/docker/aicreatorvault/uploads

# 修改权限
chmod -R 755 /volume1/docker/aicreatorvault/uploads

# 或者修改所有者（根据容器内运行的用户）
chown -R 1000:1000 /volume1/docker/aicreatorvault/uploads
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

## 备份与恢复

### 备份上传文件

```bash
# 上传文件在宿主机上，直接复制即可
cp -r /volume1/docker/aicreatorvault/uploads /backup/uploads_$(date +%Y%m%d)
```

### 备份数据库

```bash
# 导出数据库
docker-compose exec postgres pg_dump -U aicreator aicreatorvault > backup_$(date +%Y%m%d).sql

# 恢复数据库
cat backup.sql | docker-compose exec -T postgres psql -U aicreator aicreatorvault
```

## 生产环境建议

1. **修改默认密码**：确保 `DB_PASSWORD` 足够复杂
2. **启用 HTTPS**：使用反向代理配置 SSL
3. **限制端口暴露**：只暴露前端端口，内部服务不对外
4. **定期备份**：备份上传目录和数据库
5. **监控日志**：配置日志收集和告警
6. **资源限制**：根据需要添加 `deploy.resources` 限制

## 更新

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```
