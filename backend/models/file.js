const mongoose = require("mongoose")

const fileSchema = mongoose.Schema({
    originalFilename:{
        type: String,
        required: true,
    },
    filename: {
        type: String,
        required: true,
    },
    size:{
        type: Number,
        required: true,
    },
    path:{
        type: String,
        required: true,
    },
    actualPath: {
        type: String,
        required: true,
    },
    filetype: {
        type: String,
        required: true,
    },

}, { timestamps: true})


module.exports = mongoose.model("file", fileSchema)
