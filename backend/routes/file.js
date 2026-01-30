const express = require("express")
const { uploadFile } = require("../controllers/file") 
const upload = require("../middlewares/multer")
const { listFiles, downloadFile, deleteFile, deleteMultipleFiles } = require("../controllers/file")
    
const router = express.Router()

router.post("/upload/:id", upload.single("file"), uploadFile);
router.get("/list", listFiles);
router.get("/download/:id", downloadFile);
router.get("/delete/:id", deleteFile)
router.post("/delete", deleteMultipleFiles)

module.exports = router