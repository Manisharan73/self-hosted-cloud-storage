const { DataTypes } = require('sequelize')
const sequelize = require('../sequelize')
const Folder = require('./folder')

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
        tableName: 'files',
        timestamps: true
    }
)

File.belongsTo(Folder, { foreignKey: 'parentFolderId', as: 'parentFolder' })

module.exports = File