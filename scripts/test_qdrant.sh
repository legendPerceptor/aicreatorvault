#!/bin/bash

# Qdrant 集成测试脚本
# 使用方法：在项目根目录运行 ./scripts/test_qdrant.sh

set -e

echo "========================================"
echo "Qdrant 集成测试"
echo "========================================"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 docker compose 是否可用
if ! command -v docker-compose &> /dev/null; then
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}错误: docker-compose 或 docker compose 命令不可用${NC}"
        exit 1
    fi
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo -e "${YELLOW}使用命令: $COMPOSE_CMD${NC}\n"

# 1. 检查 Qdrant 服务状态
echo -e "${YELLOW}[1/6] 检查 Qdrant 服务状态...${NC}"
if $COMPOSE_CMD ps qdrant | grep -q "Up"; then
    echo -e "${GREEN}✓ Qdrant 服务运行中${NC}"
else
    echo -e "${YELLOW}Qdrant 服务未启动，正在启动...${NC}"
    $COMPOSE_CMD up -d qdrant
    sleep 5
fi

# 2. 检查 image-service 状态
echo -e "\n${YELLOW}[2/6] 检查 image-service 状态...${NC}"
if $COMPOSE_CMD ps image-service | grep -q "Up"; then
    echo -e "${GREEN}✓ image-service 运行中${NC}"
else
    echo -e "${YELLOW}image-service 未启动，正在启动...${NC}"
    $COMPOSE_CMD up -d image-service
    sleep 10
fi

# 3. 测试 Qdrant 健康检查
echo -e "\n${YELLOW}[3/6] 测试 Qdrant 连接...${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:8001/qdrant/health)
if echo "$HEALTH_RESPONSE" | grep -q '"connected":true'; then
    echo -e "${GREEN}✓ Qdrant 连接成功${NC}"
    echo "$HEALTH_RESPONSE" | jq .
else
    echo -e "${RED}✗ Qdrant 连接失败${NC}"
    echo "$HEALTH_RESPONSE"
    exit 1
fi

# 4. 初始化 Qdrant 集合
echo -e "\n${YELLOW}[4/6] 初始化 Qdrant 集合...${NC}"
INIT_RESPONSE=$(curl -s -X POST http://localhost:8001/qdrant/init)
if echo "$INIT_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✓ 集合初始化成功${NC}"
else
    echo -e "${YELLOW}集合可能已存在${NC}"
fi

# 5. 测试向量插入
echo -e "\n${YELLOW}[5/6] 测试向量插入...${NC}"
# 生成一个测试向量（1536维）
TEST_VECTOR=$(python3 -c "import json; print(json.dumps([0.1] * 1536))")

UPSERT_RESPONSE=$(curl -s -X POST http://localhost:8001/qdrant/upsert \
  -H "Content-Type: application/json" \
  -d "{
    \"image_id\": 999999,
    \"embedding\": $TEST_VECTOR,
    \"metadata\": {
      \"filename\": \"test_image.jpg\",
      \"description\": \"测试图片\",
      \"score\": 9.5
    }
  }")

if echo "$UPSERT_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✓ 向量插入成功${NC}"
else
    echo -e "${RED}✗ 向量插入失败${NC}"
    echo "$UPSERT_RESPONSE"
    exit 1
fi

# 6. 测试向量搜索
echo -e "\n${YELLOW}[6/6] 测试向量搜索...${NC}"
SEARCH_RESPONSE=$(curl -s -X POST http://localhost:8001/qdrant/search \
  -H "Content-Type: application/json" \
  -d "{
    \"query_vector\": $TEST_VECTOR,
    \"top_k\": 5
  }")

if echo "$SEARCH_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✓ 向量搜索成功${NC}"
    echo "$SEARCH_RESPONSE" | jq .
else
    echo -e "${RED}✗ 向量搜索失败${NC}"
    echo "$SEARCH_RESPONSE"
    exit 1
fi

# 7. 清理测试数据
echo -e "\n${YELLOW}清理测试数据...${NC}"
curl -s -X DELETE http://localhost:8001/qdrant/delete/999999 > /dev/null
echo -e "${GREEN}✓ 测试数据已清理${NC}"

# 8. 显示集合信息
echo -e "\n${YELLOW}Qdrant 集合信息:${NC}"
curl -s http://localhost:8001/qdrant/info | jq .

echo -e "\n${GREEN}========================================"
echo "✓ 所有测试通过！"
echo "========================================${NC}\n"

echo "下一步："
echo "1. 运行迁移脚本: python scripts/migrate_to_qdrant.py"
echo "2. 在前端测试搜索功能"
echo "3. 查看完整文档: cat QDRANT_INTEGRATION.md"
