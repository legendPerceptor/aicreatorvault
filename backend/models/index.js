const { Sequelize } = require('sequelize');

// 创建数据库连接
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './backend/database.db'
});

// 导入模型函数
const Prompt = require('./Prompt');
const Image = require('./Image');
const Theme = require('./Theme');
const ThemeImage = require('./ThemeImage');

// 初始化模型
const PromptModel = Prompt(sequelize);
const ImageModel = Image(sequelize);
const ThemeModel = Theme(sequelize);
const ThemeImageModel = ThemeImage(sequelize);

// 定义模型关系
PromptModel.hasMany(ImageModel, { foreignKey: 'promptId' });
ImageModel.belongsTo(PromptModel, { foreignKey: 'promptId' });

ThemeModel.belongsToMany(ImageModel, { through: ThemeImageModel, foreignKey: 'themeId' });
ImageModel.belongsToMany(ThemeModel, { through: ThemeImageModel, foreignKey: 'imageId' });

// 同步数据库
sequelize.sync({ force: false }).then(() => {
  console.log('Database synchronized');
});

module.exports = {
  sequelize,
  Prompt: PromptModel,
  Image: ImageModel,
  Theme: ThemeModel,
  ThemeImage: ThemeImageModel
};