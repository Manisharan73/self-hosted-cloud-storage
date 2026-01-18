const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const SharedItem = sequelize.define(
    'SharedItem',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        itemId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        itemType: {
            type: DataTypes.ENUM('file', 'folder'),
            allowNull: false
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

        sharedWith: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },

        permission: {
            type: DataTypes.ENUM('read', 'write'),
            allowNull: false,
            defaultValue: 'read'
        },

        sharedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: 'shared_items',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['itemId', 'sharedWith']
            },
            {
                fields: ['ownerId']
            },
            {
                fields: ['sharedWith']
            }
        ]
    }
);

module.exports = SharedItem;
