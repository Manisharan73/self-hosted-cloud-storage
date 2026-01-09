const mongoose = require("mongoose")

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    passhash: {
        type: String,
        required: true,
    },
    lastAccessedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true })

module.exports = mongoose.model("user", userSchema)