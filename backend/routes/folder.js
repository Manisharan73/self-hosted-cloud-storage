const express = require("express")
const {createFolder, deleteFolder} = require("../controllers/folder")

const router = new express.Router()

router.use("/create", createFolder)
router.use("/delete/:id", deleteFolder)

module.exports = router
 