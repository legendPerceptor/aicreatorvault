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

const User = require('./User');
const Prompt = require('./Prompt');
const Image = require('./Image');
const Theme = require('./Theme');
const ThemeImage = require('./ThemeImage');
const GraphNode = require('./GraphNode');
const GraphEdge = require('./GraphEdge');

const UserModel = User(sequelize);
const PromptModel = Prompt(sequelize);
const ImageModel = Image(sequelize, DB_TYPE);
const ThemeModel = Theme(sequelize);
const ThemeImageModel = ThemeImage(sequelize);
const GraphNodeModel = GraphNode(sequelize);
const GraphEdgeModel = GraphEdge(sequelize, DB_TYPE);

// User associations
UserModel.hasMany(PromptModel, { foreignKey: 'userId' });
PromptModel.belongsTo(UserModel, { foreignKey: 'userId' });

UserModel.hasMany(ImageModel, { foreignKey: 'userId' });
ImageModel.belongsTo(UserModel, { foreignKey: 'userId' });

UserModel.hasMany(ThemeModel, { foreignKey: 'userId' });
ThemeModel.belongsTo(UserModel, { foreignKey: 'userId' });

UserModel.hasMany(GraphNodeModel, { foreignKey: 'userId' });
GraphNodeModel.belongsTo(UserModel, { foreignKey: 'userId' });

// Legacy Prompt-Image relationships (kept for backward compatibility)
PromptModel.hasMany(ImageModel, { foreignKey: 'promptId' });
ImageModel.belongsTo(PromptModel, { foreignKey: 'promptId' });

// Theme-Image relationships
ThemeModel.belongsToMany(ImageModel, { through: ThemeImageModel, foreignKey: 'themeId' });
ImageModel.belongsToMany(ThemeModel, { through: ThemeImageModel, foreignKey: 'imageId' });

// Graph node-edge relationships
GraphNodeModel.hasMany(GraphEdgeModel, { foreignKey: 'sourceId', as: 'outgoingEdges' });
GraphNodeModel.hasMany(GraphEdgeModel, { foreignKey: 'targetId', as: 'incomingEdges' });
GraphEdgeModel.belongsTo(GraphNodeModel, { foreignKey: 'sourceId', as: 'source' });
GraphEdgeModel.belongsTo(GraphNodeModel, { foreignKey: 'targetId', as: 'target' });

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('[Database] Connection established successfully');

    if (DB_TYPE === 'postgres' && supportsVector()) {
      try {
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log('[Database] pgvector extension enabled');
      } catch (_err) {
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
  User: UserModel,
  Prompt: PromptModel,
  Image: ImageModel,
  Theme: ThemeModel,
  ThemeImage: ThemeImageModel,
  GraphNode: GraphNodeModel,
  GraphEdge: GraphEdgeModel,
  DB_TYPE,
  supportsVector,
};
