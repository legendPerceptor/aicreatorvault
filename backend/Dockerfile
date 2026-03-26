# Backend Dockerfile
FROM node:22-alpine

WORKDIR /app

# 使用阿里云 npm 镜像加速
RUN npm config set registry https://registry.npmmirror.com

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

# Copy backend source code
COPY backend/ ./

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api || exit 1

# Start server
CMD ["node", "server.js"]
