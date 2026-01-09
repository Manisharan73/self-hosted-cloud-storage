const mongoose = require("mongoose")

const folderSchema = mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    name: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    parentFolderId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true })

module.exports = mongoose.model("folder", folderSchema)