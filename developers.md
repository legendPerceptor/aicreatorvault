# 开发者指南

## 测试方法

### 使用 curl 命令测试 API

#### 认证 API

所有需要认证的 API 请求都需要在 Header 中包含 Access Token：
```bash
-H "Authorization: Bearer <access_token>"
```

**登录获取 Token**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  -c cookies.txt \
  http://localhost:3001/api/auth/login
```

**注册新用户**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"yourname","email":"your@email.com","password":"yourpassword"}' \
  -c cookies.txt \
  http://localhost:3001/api/auth/register
```

**获取当前用户信息**
```bash
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:3001/api/auth/me
```

**登出**
```bash
curl -X POST -c cookies.txt http://localhost:3001/api/auth/logout
```

#### 1. 测试提示词 API

- **获取所有提示词**
  ```bash
  curl http://localhost:3001/api/prompts
  ```

- **获取未被使用的提示词**
  ```bash
  curl http://localhost:3001/api/prompts/unused
  ```

- **创建新提示词**
  ```bash
  curl -X POST -H "Content-Type: application/json" -d '{"content": "测试提示词"}' http://localhost:3001/api/prompts
  ```

- **更新提示词评分**
  ```bash
  curl -X PUT -H "Content-Type: application/json" -d '{"score": 8}' http://localhost:3001/api/prompts/1/score
  ```

- **删除提示词**
  ```bash
  curl -X DELETE http://localhost:3001/api/prompts/1
  ```

#### 2. 测试图片 API

- **获取所有图片**
  ```bash
  curl http://localhost:3001/api/images
  ```

- **上传图片**
  ```bash
  curl -X POST -F "image=@/path/to/image.png" -F "promptId=1" http://localhost:3001/api/images
  ```

- **更新图片评分**
  ```bash
  curl -X PUT -H "Content-Type: application/json" -d '{"score": 9}' http://localhost:3001/api/images/1/score
  ```

- **删除图片**
  ```bash
  curl -X DELETE http://localhost:3001/api/images/1
  ```

#### 3. 测试主题 API

- **获取所有主题**
  ```bash
  curl http://localhost:3001/api/themes
  ```

- **创建新主题**
  ```bash
  curl -X POST -H "Content-Type: application/json" -d '{"name": "测试主题", "description": "测试主题描述"}' http://localhost:3001/api/themes
  ```

- **获取主题详情**
  ```bash
  curl http://localhost:3001/api/themes/1
  ```

- **添加图片到主题**
  ```bash
  curl -X POST -H "Content-Type: application/json" -d '{"imageId": 1}' http://localhost:3001/api/themes/1/images
  ```

## 数据库查询

### 使用 sqlite3 命令查询数据库

1. **安装 sqlite3**
   ```bash
   sudo apt install sqlite3
   ```

2. **连接到数据库**
   ```bash
   sqlite3 /home/yuanjian/Development/aigc-assistant/backend/database.db
   ```

3. **查询命令**

   - **查询所有提示词**
     ```sql
     SELECT * FROM Prompts;
     ```

   - **查询所有图片**
     ```sql
     SELECT * FROM Images;
     ```

   - **查询所有主题**
     ```sql
     SELECT * FROM Themes;
     ```

   - **查询主题与图片的关联**
     ```sql
     SELECT * FROM ThemeImages;
     ```

   - **查询提示词及其关联的图片**
     ```sql
     SELECT p.*, i.* FROM Prompts p LEFT JOIN Images i ON p.id = i.promptId;
     ```

   - **查询图片及其关联的提示词**
     ```sql
     SELECT i.*, p.* FROM Images i LEFT JOIN Prompts p ON i.promptId = p.id;
     ```

4. **退出 sqlite3**
   ```bash
   .quit
   ```

## 开发流程

1. **启动后端服务器**
   ```bash
   cd /home/yuanjian/Development/aigc-assistant && npm run start:backend
   ```

2. **启动前端服务器**
   ```bash
   cd /home/yuanjian/Development/aigc-assistant/frontend && npm run dev
   ```

3. **访问应用**
   前端：http://localhost:5173/
   后端 API：http://localhost:3001/

## 项目结构

- **backend/**: 后端代码
  - **routes/**: API 路由
    - **auth.js**: 认证相关路由 (登录、注册、登出、Token刷新)
  - **models/**: 数据库模型
    - **User.js**: 用户模型
  - **middleware/**: 中间件
    - **auth.js**: 认证中间件 (authenticate, optionalAuth)
  - **utils/**: 工具函数
    - **auth.js**: JWT Token 生成和验证
  - **uploads/**: 上传的图片文件
  - **server.js**: 服务器入口文件

- **frontend/**: 前端代码
  - **src/**: 源代码
    - **contexts/AuthContext.jsx**: React Auth Context (共享认证状态)
    - **hooks/useAuth.js**: 认证 Hook
  - **public/**: 静态文件
  - **vite.config.js**: Vite 配置文件

- **database.db**: SQLite 数据库文件
