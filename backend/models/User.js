const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const User = (sequelize) => {
  const UserModel = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 30],
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'password_hash',
      },
      is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_default',
        comment: '标记为遗留用户，用于迁移现有数据',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      tableName: 'Users',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { unique: true, fields: ['username'], name: 'users_username_unique' },
        { unique: true, fields: ['email'], name: 'users_email_unique' },
      ],
    }
  );

  // Instance method to check password
  UserModel.prototype.validatePassword = async function (password) {
    return bcrypt.compare(password, this.password_hash);
  };

  // Class method to hash password
  UserModel.hashPassword = async (password) => {
    return bcrypt.hash(password, 10);
  };

  return UserModel;
};

module.exports = User;
