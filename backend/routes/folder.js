const express = require("express")
const {createFolder, deleteFolder, moveFolder, copyFolder, renameFolder} = require("../controllers/folder")

const router = new express.Router()

router.post("/create", createFolder)
router.get("/delete/:id", deleteFolder)
router.post("/move", moveFolder)
router.post("/copy", copyFolder)
router.get("/rename", renameFolder)

module.exports = router
