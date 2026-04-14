# Docker Deployment Guide

> [中文版](../zh/docker-deployment.md)


This document describes how to deploy AI Creator Vault using Docker Compose.

## Architecture

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

## Quick Start

### 1. Clone the Project

```bash
git clone https://github.com/legendPerceptor/aicreatorvault.git
cd aicreatorvault
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit the `.env` file with the required configuration:

```env
# Required: Database password
DB_PASSWORD=your_secure_password

# Required: OpenAI API Key
OPENAI_API_KEY=sk-xxx

# Required: Upload file storage path (host directory)
# For NAS deployment, use absolute paths, e.g.:
# Synology: /volume1/docker/aicreatorvault/uploads
# Local development: ./uploads
UPLOADS_PATH=./uploads

# Optional: Model configuration
OPENAI_VISION_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**⚠️ Important: Upload Directory Configuration**

Uploaded images are stored on the host via bind mount, which makes it easy to:
- View images directly in the NAS file manager
- Use the NAS built-in backup functionality
- Copy the directory directly when migrating data

Ensure the directory exists:
```bash
# Create upload directory (based on your UPLOADS_PATH)
mkdir -p /volume1/docker/aicreatorvault/uploads

# Set permissions (if you encounter permission issues)
chmod 755 /volume1/docker/aicreatorvault/uploads
```

### 3. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View service status
docker-compose ps
```

### 4. Access the Application

- **Frontend**: http://your-nas-ip:5173
- **Backend API**: http://your-nas-ip:3001/api
- **Image Service**: http://your-nas-ip:8001
- **Qdrant Console**: http://your-nas-ip:6333/dashboard

## Service Overview

| Service | Port | Description |
|---------|------|-------------|
| frontend | 5173 | React frontend (Nginx) |
| backend | 3001 | Node.js backend API |
| image-service | 8001 | Python AI image analysis service |
| postgres | 5432 | PostgreSQL + pgvector |
| redis | 6379 | Redis cache |
| qdrant | 6333/6334 | Qdrant vector database |

## Data Storage

| Data Type | Storage Method | Location |
|-----------|---------------|----------|
| Uploaded images | Bind Mount | `UPLOADS_PATH` (host directory) |
| Database data | Named Volume | Docker-managed `postgres_data` |
| Redis cache | Named Volume | Docker-managed `redis_data` |
| Vector data | Named Volume | Docker-managed `qdrant_data` |

**Why use Bind Mount for uploads?**
- Can view files directly in the NAS file manager
- Easy to use NAS backup functionality
- Only need to copy the directory when migrating

## Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ This will delete database data)
docker-compose down -v

# Rebuild
docker-compose build --no-cache

# View logs
docker-compose logs -f [service_name]

# Enter container
docker-compose exec backend sh
docker-compose exec image-service bash

# Restart a single service
docker-compose restart backend
```

## Remote Access Configuration

### Option A: NAS Reverse Proxy (Recommended)

**Synology:**
1. Control Panel → Login Portal → Advanced → Reverse Proxy
2. Add rule:
   - Source: `https://your-domain.com` (or custom port)
   - Destination: `http://localhost:5173`

### Option B: Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API (optional, if you need to expose separately)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option C: Tailscale/ZeroTier

Access the NAS internal IP directly through VPN.

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs backend
docker-compose logs image-service

# Check environment variables
docker-compose config
```

### Upload File Permission Issues

```bash
# Check upload directory permissions
ls -la /volume1/docker/aicreatorvault/uploads

# Change permissions
chmod -R 755 /volume1/docker/aicreatorvault/uploads

# Or change owner (based on the user running inside the container)
chown -R 1000:1000 /volume1/docker/aicreatorvault/uploads
```

### Database Connection Failed

```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready

# Manually connect to database
docker-compose exec postgres psql -U aicreator -d aicreatorvault
```

### Vector Search Not Working

```bash
# Check Qdrant status
curl http://localhost:6333/

# View Qdrant collections
curl http://localhost:6333/collections
```

## Backup and Recovery

### Backup Upload Files

```bash
# Upload files are on the host, just copy them directly
cp -r /volume1/docker/aicreatorvault/uploads /backup/uploads_$(date +%Y%m%d)
```

### Backup Database

```bash
# Export database
docker-compose exec postgres pg_dump -U aicreator aicreatorvault > backup_$(date +%Y%m%d).sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U aicreator aicreatorvault
```

## Production Recommendations

1. **Change default password**: Ensure `DB_PASSWORD` is sufficiently complex
2. **Enable HTTPS**: Configure SSL using a reverse proxy
3. **Limit port exposure**: Only expose the frontend port, keep internal services private
4. **Regular backups**: Backup both the upload directory and database
5. **Monitor logs**: Configure log collection and alerting
6. **Resource limits**: Add `deploy.resources` limits as needed

## Updates

```bash
# Pull latest code
git pull

# Rebuild and start
docker-compose up -d --build
```
