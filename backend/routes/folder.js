const express = require("express")
const {createFolder, deleteFolder, moveFolder, copyFolder, renameFolder} = require("../controllers/folder")

const router = new express.Router()

router.post("/create", createFolder)
router.get("/delete/:id", deleteFolder)
router.get("/move", moveFolder)
router.get("/copy", copyFolder)
router.get("/rename", renameFolder)

module.exports = router
