const multer = require("multer")
const fs = require("fs")
const path = require("path")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!req.user || !req.user.uniqueName) {
            return cb(new Error("User authentication failed: uniqueName missing"), null)
        }

        const uniqueName = req.user.uniqueName
        const userFolder = path.join(__dirname, "..", "uploads", uniqueName)

        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true })
        }

        cb(null, userFolder)
    },

    filename: (req, file, cb) => {
        const sanitizedFilename = path.basename(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '_')
        cb(null, Date.now() + "-" + sanitizedFilename)
    }
})

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } 
})

module.exports = upload