const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const UserVerify = sequelize.define(
    'UserVerify',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },

        secret: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },

        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    },
    { tableName: 'user_verifies', timestamps: true }
);

module.exports = UserVerify;
