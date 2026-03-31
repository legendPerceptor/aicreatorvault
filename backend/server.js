const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// 导入路由
const promptsRouter = require('./routes/prompts');
const imagesRouter = require('./routes/images');
const themesRouter = require('./routes/themes');
const assetsRouter = require('./routes/assets');
const graphRouter = require('./routes/graph');
const relationshipsRouter = require('./routes/relationships');
const referenceSearchRouter = require('./routes/referenceSearch');
const authRouter = require('./routes/auth');
const filesRouter = require('./routes/files');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 静态文件服务 - 移除，使用受保护的 /api/files 路由
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// 路由
app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/images', imagesRouter);
app.use('/api/themes', themesRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/graph', graphRouter);
app.use('/api/relationships', relationshipsRouter);
app.use('/api/reference-search', referenceSearchRouter);

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
