const express = require("express")
const {createFolder, deleteFolder, moveFolder, copyFolder} = require("../controllers/folder")

const router = new express.Router()

router.post("/create", createFolder)
router.get("/delete/:id", deleteFolder)
router.get("/move/:folderId/:to", moveFolder)
router.get("/copy/:folderId/:to", copyFolder)

module.exports = router
