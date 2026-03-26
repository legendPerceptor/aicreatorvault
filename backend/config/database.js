require('dotenv').config({ path: __dirname + '/../../.env' });

const path = require('path');
const DB_TYPE = process.env.DB_TYPE || 'sqlite';

const POSTGRES_LIKE_DIALECTS = ['postgres', 'opengauss'];

function isPostgresLike() {
  return POSTGRES_LIKE_DIALECTS.includes(DB_TYPE);
}

function getDatabaseConfig() {
  const baseConfig = {
    define: {
      underscored: true,
      freezeTableName: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  };

  if (isPostgresLike()) {
    const defaultPorts = {
      postgres: 5432,
      opengauss: 5433,
    };
    const defaultUsers = {
      postgres: 'postgres',
      opengauss: 'gaussdb',
    };

    return {
      ...baseConfig,
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || defaultPorts[DB_TYPE] || '5432', 10),
      database: process.env.DB_NAME || 'aicreatorvault',
      username: process.env.DB_USER || defaultUsers[DB_TYPE] || 'postgres',
      password: process.env.DB_PASSWORD || '',
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
  return isPostgresLike();
}

module.exports = {
  DB_TYPE,
  getDatabaseConfig,
  supportsVector,
  isPostgresLike,
  POSTGRES_LIKE_DIALECTS,
};
