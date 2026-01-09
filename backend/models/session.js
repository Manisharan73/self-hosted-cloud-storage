const mongoose = require("mongoose")

const sessionSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
    }
}, {timestamps: true})

module.exports = mongoose.model("session", sessionSchema)