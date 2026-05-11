require('dotenv').config({ path: __dirname + '/../.env' });

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
const lightragRouter = require('./routes/lightrag');

const app = express();

// 中间件
// CORS 配置 - 支持 credentials 用于 cookie
app.use(
  cors({
    origin: true, // 开发环境允许所有来源，生产环境应配置具体域名
    credentials: true, // 允许发送 cookie
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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
app.use('/api/lightrag', lightragRouter);

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
