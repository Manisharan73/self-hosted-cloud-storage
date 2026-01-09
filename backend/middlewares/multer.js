const multer = require("multer")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./tmp")
    },
    filename: (req, file, cb) => {
        cb(null,  file.originalname)
    }
})

// const upload = multer({ storage })

const upload = multer({ storage: multer.memoryStorage() });

module.exports = upload