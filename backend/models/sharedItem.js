const mongoose = require("mongoose")

const mongoose = require("mongoose")

const SharedItemSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    itemType: {
        type: String,
        enum: ["file", "folder"],
        required: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    sharedWith: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    permission: {
        type: String,
        enum: ["read", "write"],
        default: "read",
    },
    sharedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true, })

SharedItemSchema.index(
    { itemId: 1, sharedWith: 1 },
    { unique: true }
)

module.exports = mongoose.model("sharedItem", SharedItemSchema)