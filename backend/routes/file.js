const express = require("express");
const router = express.Router();
const { 
    uploadFile, listFiles, downloadFile, deleteFile, 
    deleteMultipleFiles, copyFile, renameFile, moveFile, 
    moveToTrash, restoreItem, listTrash
} = require("../controllers/file");
const upload = require("../middlewares/multer");


router.delete("/delete/:id", deleteFile); 

router.post("/upload/:id", upload.single("file"), uploadFile);
router.get("/list", listFiles);
router.get("/download/:id", downloadFile);
router.post("/delete-multiple", deleteMultipleFiles);
router.post("/copy", copyFile);
router.post("/move", moveFile);
router.post("/rename", renameFile)
router.get("/listTrash", listTrash)
router.post("/trash/:id", moveToTrash)
router.post("/restore/:id", restoreItem)

module.exports = router;