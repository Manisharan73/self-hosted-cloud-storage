const { DataTypes } = require('sequelize')
const sequelize = require('../sequelize')

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
        },
        isTrashed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: 'folders',
        timestamps: true
    }
)

Folder.belongsTo(Folder, { foreignKey: 'parentFolderId', as: 'parentFolder' })
Folder.hasMany(Folder, { foreignKey: 'parentFolderId', as: 'subFolders' })



module.exports = Folder