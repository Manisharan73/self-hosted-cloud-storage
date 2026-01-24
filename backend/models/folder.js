const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Folder = sequelize.define(
    'Folder',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        ownerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false
        },

        parentFolderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'folders',
                key: 'id'
            },
            onDelete: 'CASCADE', 
            onUpdate: 'CASCADE'
        }
    },
    {
        tableName: 'folders',
        timestamps: true
    }
);

module.exports = Folder;
