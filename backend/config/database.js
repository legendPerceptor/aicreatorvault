require('dotenv').config({ path: __dirname + '/../.env' });

const path = require('path');
const DB_TYPE = process.env.DB_TYPE || 'sqlite';

function getDatabaseConfig() {
  const baseConfig = {
    define: {
      underscored: true, // 自动转换 camelCase → snake_case
      freezeTableName: true, // 不自动复数化表名
      timestamps: true, // 自动添加 createdAt, updatedAt
      createdAt: 'created_at', // 使用 snake_case
      updatedAt: 'updated_at', // 使用 snake_case
    },
  };

  if (DB_TYPE === 'postgres') {
    return {
      ...baseConfig,
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'aigc_assistant',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      dialectOptions: {
        ssl:
          process.env.DB_SSL === 'true'
            ? {
                require: true,
                rejectUnauthorized: false,
              }
            : false,
      },
      pool: {
        max: parseInt(process.env.DB_POOL_MAX || '5', 10),
        min: parseInt(process.env.DB_POOL_MIN || '0', 10),
        acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
        idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
      },
    };
  }

  const storagePath = process.env.DB_STORAGE || './database.db';
  const absoluteStorage = path.isAbsolute(storagePath)
    ? storagePath
    : path.resolve(__dirname, '..', storagePath);

  return {
    ...baseConfig,
    dialect: 'sqlite',
    storage: absoluteStorage,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  };
}

function supportsVector() {
  return DB_TYPE === 'postgres';
}

module.exports = {
  DB_TYPE,
  getDatabaseConfig,
  supportsVector,
};
