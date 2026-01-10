const mongoose = require("mongoose")

const fileSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    },
    originalFilename: String,
    filename: String,
    size: Number,
    path: String,
    actualPath: String,
    mimetype: String,
    parentFolderId: mongoose.Schema.Types.ObjectId,

}, { timestamps: true })

module.exports = mongoose.model("file", fileSchema)
