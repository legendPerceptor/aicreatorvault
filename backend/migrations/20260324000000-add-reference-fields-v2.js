'use strict';

/**
 * 迁移：添加参考图搜索功能所需的字段（PostgreSQL 标准版）
 *
 * 这个迁移会：
 * 1. 添加新字段（使用 snake_case 命名）
 * 2. 不使用双引号，让 PostgreSQL 自动转为小写
 *
 * Sequelize 配置：
 * - 数据库列名：is_reference, original_url, source_name, theme_id
 * - 模型字段名：isReference, originalUrl, sourceName, themeId
 * - Sequelize 自动转换（underscored: true）
 *
 * 执行方式：
 * npx sequelize-cli db:migrate
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    console.log('开始迁移：添加参考图搜索字段（snake_case 版本）...');

    // =========================================
    // 添加新字段（使用 snake_case，不加引号）
    // =========================================

    // 添加 is_reference 字段
    await queryInterface.addColumn('Images', 'is_reference', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
    console.log('  添加列: is_reference');

    // 添加 original_url 字段
    await queryInterface.addColumn('Images', 'original_url', {
      type: DataTypes.STRING(2048),
      allowNull: true,
    });
    console.log('  添加列: original_url');

    // 添加 source_name 字段
    await queryInterface.addColumn('Images', 'source_name', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    console.log('  添加列: source_name');

    // 添加 title 字段
    await queryInterface.addColumn('Images', 'title', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    console.log('  添加列: title');

    // 添加 width 字段
    await queryInterface.addColumn('Images', 'width', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    console.log('  添加列: width');

    // 添加 height 字段
    await queryInterface.addColumn('Images', 'height', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    console.log('  添加列: height');

    // 添加 theme_id 字段
    await queryInterface.addColumn('Images', 'theme_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Themes',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    console.log('  添加列: theme_id');

    // =========================================
    // 添加索引
    // =========================================

    await queryInterface.addIndex('Images', ['is_reference'], {
      name: 'idx_images_is_reference',
    });

    await queryInterface.addIndex('Images', ['theme_id'], {
      name: 'idx_images_theme_id',
    });

    await queryInterface.addIndex('Images', ['source_name'], {
      name: 'idx_images_source_name',
    });

    console.log('✅ 迁移完成！');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('开始回滚迁移...');

    // 删除索引
    await queryInterface.removeIndex('Images', 'idx_images_is_reference');
    await queryInterface.removeIndex('Images', 'idx_images_theme_id');
    await queryInterface.removeIndex('Images', 'idx_images_source_name');

    // 删除字段
    await queryInterface.removeColumn('Images', 'is_reference');
    await queryInterface.removeColumn('Images', 'original_url');
    await queryInterface.removeColumn('Images', 'source_name');
    await queryInterface.removeColumn('Images', 'title');
    await queryInterface.removeColumn('Images', 'width');
    await queryInterface.removeColumn('Images', 'height');
    await queryInterface.removeColumn('Images', 'theme_id');

    console.log('✅ 回滚完成！');
  },
};
