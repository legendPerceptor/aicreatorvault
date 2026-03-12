const { Sequelize } = require('sequelize');
const { getDatabaseConfig, DB_TYPE, supportsVector } = require('../config/database');

const config = getDatabaseConfig();

console.log(`[Database] Using ${DB_TYPE} database`);
if (DB_TYPE === 'postgres') {
  console.log(`[Database] Connecting to ${config.host}:${config.port}/${config.database}`);
} else {
  console.log(`[Database] Storage: ${config.storage}`);
}

const sequelize = new Sequelize(config);

const Prompt = require('./Prompt');
const Image = require('./Image');
const Theme = require('./Theme');
const ThemeImage = require('./ThemeImage');

const PromptModel = Prompt(sequelize);
const ImageModel = Image(sequelize, DB_TYPE);
const ThemeModel = Theme(sequelize);
const ThemeImageModel = ThemeImage(sequelize);

PromptModel.hasMany(ImageModel, { foreignKey: 'promptId' });
ImageModel.belongsTo(PromptModel, { foreignKey: 'promptId' });

ThemeModel.belongsToMany(ImageModel, { through: ThemeImageModel, foreignKey: 'themeId' });
ImageModel.belongsToMany(ThemeModel, { through: ThemeImageModel, foreignKey: 'imageId' });

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('[Database] Connection established successfully');

    if (DB_TYPE === 'postgres' && supportsVector()) {
      try {
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log('[Database] pgvector extension enabled');
      } catch (err) {
        console.warn(
          '[Database] pgvector extension not available. Vector search will use JSON fallback.'
        );
        console.warn(
          '[Database] To enable vector support, install pgvector extension in PostgreSQL.'
        );
      }
    }

    await sequelize.sync({ force: false });
    console.log('[Database] Models synchronized');
  } catch (err) {
    console.error('[Database] Initialization error:', err.message);
    process.exit(1);
  }
}

initializeDatabase();

module.exports = {
  sequelize,
  Prompt: PromptModel,
  Image: ImageModel,
  Theme: ThemeModel,
  ThemeImage: ThemeImageModel,
  DB_TYPE,
  supportsVector,
};
