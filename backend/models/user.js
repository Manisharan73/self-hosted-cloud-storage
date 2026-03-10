const { DataTypes } = require('sequelize')
const sequelize = require('../sequelize')
const Folder = require("./folder")
const File = require("./file")

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        passhash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        uniqueName:{
            type: DataTypes.STRING,
            allowNull: true
        },
        lastAccessedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        }
    },
    {
        tableName: 'users',
        timestamps: true, 
        indexes: [
            { unique: true, fields: ['username'] },
            { unique: true, fields: ['email'] }
        ]
    }
)

User.hasMany(Folder, { 
    foreignKey: 'ownerId' 
})

User.hasMany(File, { 
    foreignKey: 'ownerId' 
})

module.exports = User
