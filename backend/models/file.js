const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const File = sequelize.define(
    'File',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        ownerId: {
            type: DataTypes.INTEGER,
            // allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },

        originalFilename: DataTypes.STRING,
        filename: DataTypes.STRING,
        size: DataTypes.BIGINT,
        mimetype: DataTypes.STRING,

        parentFolderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'folders',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }
    },
    {
        tableName: 'files',
        timestamps: true
    }
);

module.exports = File;
