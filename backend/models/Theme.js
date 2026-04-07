const { DataTypes } = require('sequelize');

const Theme = (sequelize) => {
  return sequelize.define(
    'Theme',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'user_id',
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_public: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_public',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
    },
    {
      tableName: 'Themes',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          fields: ['user_id'],
          name: 'themes_user_id_index',
        },
        {
          fields: ['is_public'],
          name: 'themes_is_public_index',
        },
      ],
    }
  );
};

module.exports = Theme;
