const { Sequelize, _DataTypes } = require('sequelize');
const Image = require('./models/Image');

// 直接创建数据库连接，避免触发models/index.js中的force: true操作
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.db',
});

// 定义Image模型
const image_model = Image(sequelize);

async function checkImages() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');

    // 同步模型到数据库（不删除现有表）
    await sequelize.sync({ force: false });
    console.log('Database synchronized');

    const images = await image_model.findAll();
    console.log('Images in database:', images.length);
    console.log('Image details:');
    images.forEach((image) => {
      console.log(
        `ID: ${image.id}, Filename: ${image.filename}, Path: ${image.path}, PromptId: ${image.promptId}`
      );
    });

    await sequelize.close();
  } catch (error) {
    console.error('Error checking images:', error);
    await sequelize.close();
  }
}

checkImages();
