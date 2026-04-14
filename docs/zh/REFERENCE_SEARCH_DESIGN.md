# 参考图搜索功能设计文档

> [English](../en/REFERENCE_SEARCH_DESIGN.md)


## 目标
在 AI Creator Vault 中实现"参考图搜索"功能，让用户能够：
1. 输入描述或关键词搜索网络上的参考图
2. 在搜索结果页面预览和选择图片
3. 一键下载并添加到本地数据库

## 技术方案

### 1. 数据流

```
用户输入 → Brave Search API → 获取图片URL列表 → 前端展示 → 用户选择 → 下载图片 → 添加到数据库
```

### 2. 后端 API 设计

#### 新增路由：`/api/reference-search`

```javascript
// 搜索参考图
POST /api/reference-search/search
Body: { query: string, count: number }
Response: {
  results: [
    {
      thumbnail: string,    // 缩略图 URL
      originalUrl: string,  // 原图 URL
      title: string,        // 图片标题
      source: string,       // 来源网站
      width: number,
      height: number
    }
  ]
}

// 下载并添加参考图到数据库
POST /api/reference-search/download
Body: {
  url: string,
  title: string,
  source: string,
  themeId?: number  // 可选，直接关联到主题
}
Response: {
  success: boolean,
  image: Image,     // 创建的图片对象
  message: string
}

// 批量下载
POST /api/reference-search/batch-download
Body: {
  images: [{ url, title, source }],
  themeId?: number
}
Response: {
  success: number,
  failed: number,
  images: Image[]
}
```

### 3. 前端组件设计

#### 新页面：`ReferenceSearchPage.jsx`

```
┌─────────────────────────────────────────────────────────┐
│  🌐 参考图搜索                                            │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐    │
│  │ 搜索框：描述你想要的参考图...              [搜索] │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  过滤器：[全部] [风景] [人物] [建筑] [抽象] ...          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  搜索结果 (20张)          [已选: 3张] [批量添加]        │
│                                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │ 🖼️ │ │ 🖼️ │ │ 🖼️ │ │ 🖼️ │ │ 🖼️ │              │
│  │     │ │  ✓  │ │     │ │  ✓  │ │     │              │
│  │[添加]│ │[添加]│ │[添加]│ │[添加]│ │[添加]│              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
│                                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │ 🖼️ │ │ 🖼️ │ │ 🖼️ │ │ 🖼️ │ │ 🖼️ │              │
│  │  ✓  │ │     │ │     │ │     │ │     │              │
│  │[添加]│ │[添加]│ │[添加]│ │[添加]│ │[添加]│              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
│                                                         │
│  [加载更多]                                             │
└─────────────────────────────────────────────────────────┘
```

#### 组件列表

1. **ReferenceSearchBox** - 搜索输入框
2. **ReferenceSearchFilters** - 过滤器（可选）
3. **ReferenceSearchResults** - 搜索结果网格
4. **ReferenceImageCard** - 单个搜索结果卡片
5. **BatchAddModal** - 批量添加到主题的弹窗

### 4. 后端实现细节

#### 4.1 Brave Search 集成

```javascript
// backend/routes/referenceSearch.js

const axios = require('axios');

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/images/search';

async function searchImages(query, count = 20) {
  const response = await axios.get(BRAVE_SEARCH_URL, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY
    },
    params: {
      q: query,
      count: count,
      safesearch: 'moderate'
    }
  });

  return response.data.results || [];
}
```

#### 4.2 图片下载服务

```javascript
// backend/services/imageDownloader.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadImage(url, uploadsDir) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 10000
  });

  const filename = `ref_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const filepath = path.join(uploadsDir, filename);

  fs.writeFileSync(filepath, response.data);

  return {
    filename,
    filepath,
    size: response.data.length
  };
}
```

### 5. 数据库模型扩展

在 Image 模型中添加字段：

```javascript
// 添加到 Image 模型
isReference: {
  type: DataTypes.BOOLEAN,
  defaultValue: false
},
sourceUrl: {
  type: DataTypes.STRING,
  allowNull: true
},
sourceName: {
  type: DataTypes.STRING,
  allowNull: true
}
```

### 6. 用户交互流程

1. **搜索阶段**
   - 用户在搜索框输入描述（如 "cyberpunk city night"）
   - 点击搜索，调用 Brave Image Search API
   - 展示缩略图网格

2. **选择阶段**
   - 用户可以点击图片预览大图
   - 勾选想要的图片
   - 可以选择添加到哪个主题（可选）

3. **添加阶段**
   - 单张：点击"添加"按钮，立即下载并添加
   - 批量：选择多张后点击"批量添加"
   - 后台下载图片，调用现有的图片分析服务
   - 添加完成后显示成功提示

### 7. 错误处理

- 下载失败：显示错误，允许重试
- API 限制：显示友好提示，建议稍后再试
- 网络问题：超时处理，显示错误信息

### 8. 性能优化

- 缩略图懒加载
- 下载队列管理（避免并发过高）
- 进度显示（批量下载时）

### 9. 配置项

在 `.env` 中添加：

```env
# Brave Search API
BRAVE_API_KEY=your_api_key

# 参考图搜索配置
REFERENCE_SEARCH_ENABLED=true
REFERENCE_SEARCH_MAX_RESULTS=50
REFERENCE_DOWNLOAD_TIMEOUT=15000
```

## 实现计划

### Phase 1: 基础功能（1-2天）
- [ ] 创建后端路由 `referenceSearch.js`
- [ ] 实现 Brave Search 集成
- [ ] 实现图片下载服务
- [ ] 创建前端页面和基础组件

### Phase 2: 交互优化（1天）
- [ ] 添加预览大图功能
- [ ] 实现批量选择和下载
- [ ] 添加进度显示
- [ ] 错误处理和重试

### Phase 3: 高级功能（可选）
- [ ] 搜索历史记录
- [ ] 收藏搜索结果
- [ ] 自动去重（检查是否已下载）
- [ ] 与 AI 分析结合（搜索前分析用户意图）

## API 费用

Brave Search API 免费额度：
- 2,000 次搜索/月
- 适合个人使用

如果需要更高配额：
- Basic: $5/月，5,000 次搜索
- Pro: $50/月，60,000 次搜索
