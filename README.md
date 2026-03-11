# AIGC 辅助工具

一个用于管理 AI 生成内容的辅助工具，帮助用户存储、组织和检索 AI 生成的图片和提示词。

## 功能特点

- **提示词管理**：存储和管理 AI 生成的提示词，支持打分和关联图片
- **图片管理**：上传和管理 AI 生成的图片，支持打分和关联提示词（支持不关联提示词）
- **主题管理**：围绕主题组织参考图片，支持拖拽上传
- **检索参考**：通过提示词搜索相关图片

## 技术栈

- **后端**：Node.js + Express.js + Sequelize + SQLite
- **前端**：React + Vite

## 安装步骤

1. **克隆项目**：

   ```bash
   git clone <repository-url>
   cd aigc-assistant
   ```

2. **安装依赖**：

   ```bash
   npm install
   cd frontend
   npm install
   ```

3. **启动服务**：
   - 启动后端服务：
     ```bash
     npm run start:backend
     ```
   - 启动前端服务：
     ```bash
     cd frontend
     npm run dev
     ```

4. **访问应用**：
   - 前端：http://localhost:5173/
   - 后端 API：http://localhost:3001/api

## 项目结构

```
aigc-assistant/
├── backend/
│   ├── models/       # 数据库模型
│   ├── routes/       # API 路由
│   ├── uploads/      # 上传的图片
│   ├── server.js     # 后端服务器
│   └── database.db   # SQLite 数据库
├── frontend/
│   ├── src/
│   │   ├── components/   # 可复用组件
│   │   │   ├── StarRating.jsx   # 星星评分组件
│   │   │   └── ImageCard.jsx    # 图片卡片组件
│   │   ├── pages/        # 页面组件
│   │   │   ├── PromptsPage.jsx  # 提示词管理页面
│   │   │   ├── ImagesPage.jsx   # 图片管理页面
│   │   │   ├── ThemesPage.jsx   # 主题管理页面
│   │   │   └── SearchPage.jsx   # 检索参考页面
│   │   ├── hooks/        # 自定义 Hooks
│   │   │   ├── usePrompts.js    # 提示词状态管理
│   │   │   ├── useImages.js     # 图片状态管理
│   │   │   └── useThemes.js     # 主题状态管理
│   │   ├── App.jsx       # 主应用组件
│   │   ├── main.jsx      # 入口文件
│   │   └── index.css     # 样式文件
│   └── public/       # 前端静态文件
├── .husky/           # Git hooks
├── package.json      # 项目配置
└── README.md         # 项目说明
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
- `POST /api/images` - 上传图片
- `PUT /api/images/:id/score` - 更新图片评分
- `PUT /api/images/:id/prompt` - 更新图片关联的提示词
- `DELETE /api/images/:id` - 删除图片

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

### 架构说明

- **组件化设计**：将 UI 拆分为可复用的组件（StarRating、ImageCard）
- **页面分离**：每个功能模块独立为页面组件
- **状态管理**：使用自定义 Hooks 封装数据获取和状态逻辑
- **单一职责**：每个文件只负责一个功能，便于维护和测试

## 开发者指南

更多开发相关的信息，包括测试方法和数据库查询命令，请查看 [开发者指南](developers.md)。
