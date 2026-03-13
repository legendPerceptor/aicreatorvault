# AI Creator Vault

一个服务于 AI 创作者的资产管理平台，帮助你安全地存储、组织和检索 AI 生成的图片、提示词等创作资产。通过知识图谱技术，可视化探索资产之间的关系，追踪创作演化路径。

## 功能特点

### 核心功能
- **提示词管理**：存储和管理 AI 创作提示词，支持评分和关联图片
- **图片管理**：上传和管理 AI 生成的图片，支持评分和关联提示词
- **主题管理**：围绕主题组织参考图片，支持拖拽上传和灵活分类

### 智能搜索
- **AI 图片分析**：自动分析图片内容并生成描述和嵌入向量
- **向量搜索**：支持基于语义相似度的文本搜图和以图搜图
- **语义检索**：通过自然语言描述找到最相关的图片

### 知识图谱 🌟
- **可视化图谱**：交互式图形界面展示资产及其关系
- **关系追踪**：追踪提示词、图片、衍生版本之间的关系链
- **路径发现**：查找资产间的最短关联路径
- **衍生管理**：支持编辑、变体、放大、裁剪等多种衍生类型
- **图谱遍历**：广度优先搜索邻居节点，发现创作网络

## 技术栈

- **后端**：Node.js + Express.js + Sequelize
- **数据库**：SQLite（默认）/ PostgreSQL（推荐生产环境）
- **前端**：React + Vite
- **AI 服务**：Python + FastAPI + OpenAI API

## 数据库支持

项目支持两种数据库：

| 数据库 | 适用场景 | 向量支持 |
|--------|----------|----------|
| SQLite | 开发、测试、小型部署 | JSON 存储 |
| PostgreSQL | 生产环境、大数据量 | pgvector 原生向量类型 |

### 配置方式

在 `backend/.env` 文件中设置：

```env
# 数据库类型：sqlite 或 postgres
DB_TYPE=sqlite

# SQLite 配置
DB_STORAGE=./database.db

# PostgreSQL 配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aigc_assistant
DB_USER=postgres
DB_PASSWORD=your_password
```

## 安装步骤

### 1. 克隆项目

```bash
git clone git@github.com:legendPerceptor/aicreatorvault.git
cd aicreatorvault
```

### 2. 安装依赖

```bash
npm install
cd frontend
npm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp backend/.env.example backend/.env
# 编辑 backend/.env 配置数据库

# 配置 AI 服务
cp image-service/.env.example image-service/.env
# 编辑 image-service/.env 配置 OpenAI API Key
```

### 4. PostgreSQL 设置（可选）

如果使用 PostgreSQL：

```bash
# 安装 PostgreSQL 和 pgvector
sudo apt install postgresql postgresql-16-pgvector

# 创建数据库和用户
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE aigc_assistant OWNER postgres;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE aigc_assistant TO postgres;"

# 启用 pgvector 扩展
PGPASSWORD='your_password' psql -h localhost -U postgres -d aigc_assistant -c "CREATE EXTENSION vector;"
```

### 5. 启动服务

```bash
# 启动所有服务
npm run dev:full

# 或分别启动
npm run start:backend    # 后端服务 (端口 3001)
npm run start:frontend   # 前端服务 (端口 5173)
npm run start:image-service  # AI 服务 (端口 8001)
```

### 6. 访问应用

- 前端：http://localhost:5173/
- 后端 API：http://localhost:3001/api
- AI 服务：http://localhost:8001/

## 项目结构

```
aigc-assistant/
├── backend/
│   ├── config/
│   │   └── database.js      # 数据库配置
│   ├── models/
│   │   ├── index.js         # 数据库连接和模型导出
│   │   ├── Prompt.js        # 提示词模型
│   │   ├── Image.js         # 图片模型（含向量字段）
│   │   ├── Theme.js         # 主题模型
│   │   └── ThemeImage.js    # 主题-图片关联模型
│   ├── routes/
│   │   ├── prompts.js       # 提示词 API
│   │   ├── images.js        # 图片 API
│   │   └── themes.js        # 主题 API
│   ├── services/
│   │   └── imageServiceClient.js  # AI 服务客户端
│   ├── utils/
│   │   └── vectorSearch.js  # 向量搜索工具
│   ├── uploads/             # 上传的图片
│   ├── .env                 # 环境变量配置
│   ├── .env.example         # 环境变量模板
│   ├── server.js            # 后端服务器
│   └── database.db          # SQLite 数据库（默认）
├── frontend/
│   ├── src/
│   │   ├── components/      # 可复用组件
│   │   ├── pages/           # 页面组件
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── App.jsx          # 主应用组件
│   │   ├── main.jsx         # 入口文件
│   │   └── index.css        # 样式文件
│   └── public/              # 前端静态文件
├── image-service/
│   ├── main.py              # AI 服务入口
│   ├── requirements.txt     # Python 依赖
│   ├── .env                 # AI 服务环境变量
│   └── .env.example         # 环境变量模板
├── stop.sh                  # 停止服务脚本
├── package.json             # 项目配置
└── README.md                # 项目说明
```

## API 端点

### 提示词 API

- `GET /api/prompts` - 获取所有提示词
- `GET /api/prompts/unused` - 获取未使用的提示词
- `POST /api/prompts` - 创建新提示词
- `PUT /api/prompts/:id/score` - 更新提示词评分
- `DELETE /api/prompts/:id` - 删除提示词

### 图片 API

- `GET /api/images` - 获取所有图片
- `POST /api/images` - 上传图片（自动分析）
- `POST /api/images/:id/analyze` - 分析图片
- `POST /api/images/batch-analyze` - 批量分析图片
- `PUT /api/images/:id/score` - 更新图片评分
- `PUT /api/images/:id/prompt` - 更新图片关联的提示词
- `DELETE /api/images/:id` - 删除图片
- `POST /api/images/search` - 文本搜索图片
- `POST /api/images/search-by-image` - 以图搜图

### 主题 API

- `GET /api/themes` - 获取所有主题
- `POST /api/themes` - 创建新主题
- `POST /api/themes/:id/images` - 为主题添加图片
- `DELETE /api/themes/:id/images/:imageId` - 从主题中移除图片

## 开发指南

### 代码规范

项目使用 Prettier 进行代码格式化，并通过 Husky 在提交前自动格式化代码。

```bash
# 手动格式化代码
npx prettier --write "**/*.js"
```

### 停止服务

```bash
./stop.sh
```

### 架构说明

- **组件化设计**：将 UI 拆分为可复用的组件（StarRating、ImageCard）
- **页面分离**：每个功能模块独立为页面组件
- **状态管理**：使用自定义 Hooks 封装数据获取和状态逻辑
- **单一职责**：每个文件只负责一个功能，便于维护和测试
- **数据库抽象**：通过 Sequelize ORM 支持多种数据库
- **向量搜索**：PostgreSQL 使用 pgvector，SQLite 使用 JSON 回退

## 开发者指南

更多开发相关的信息，包括测试方法和数据库查询命令，请查看 [开发者指南](developers.md)。
