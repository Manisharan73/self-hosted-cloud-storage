const express = require("express")
const {createFolder, deleteFolder, moveFolder, copyFolder, renameFolder, moveToTrash, restoreItem} = require("../controllers/folder")

const router = new express.Router()

router.post("/create", createFolder)
router.delete("/delete/:id", deleteFolder)
router.post("/move", moveFolder)
router.post("/copy", copyFolder)
router.post("/rename", renameFolder)
router.post("/trash/:id", moveToTrash);
router.post("/restore/:id", restoreItem);

module.exports = router
