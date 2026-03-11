const express = require('express');
const cors = require('cors');
const path = require('path');

// 导入路由
const promptsRouter = require('./routes/prompts');
const imagesRouter = require('./routes/images');
const themesRouter = require('./routes/themes');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 路由
app.use('/api/prompts', promptsRouter);
app.use('/api/images', imagesRouter);
app.use('/api/themes', themesRouter);

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
