const axios = require("axios")
const User = require("../models/user")
const Folder = require("../models/folder")
const File = require("../models/file")

async function createRootDir(userId) {
    const rootFolder = Folder.create({
        ownerId: userId,
        name: "root",
        parentFolderId: null
    }).then(() => {
        console.log("Root folder is created for the user")
    }).catch((err) => {
        console.log(err)
    })
}

async function createFolder(req, res) {
    const body = req.body
    console.log(body)
    let folderID

    if (!body.parentFolderId) {
        const folder = await Folder.findOne({
            where: {
                ownerId: req.user.id,
                parentFolderId: null
            }
        })
        folderID = folder.id
    } else
        folderID = body.parentFolderId

    const files = await File.findAll({
        where:{
            ownerId: req.user.id,
            parentFolderId: folderID
        }
    })

    if(files){
        console.log(files)
    }
        


    const newFolder = Folder.create({
        ownerId: body.userId,
        name: body.name,
        parentFolderId: folderID
    }).then(() => {
        console.log("Folder is created for the user")
        return res.status(201).json({
            status: true,
            msg: "Folder created successfully"
        })
    }).catch((err) => {
        console.log(err)
        return res.status(500).json({
            status: true,
            msg: "Folder creation failed",
            err: err
        })
    })
}

async function deleteFolder(req, res) {
    const folder = await Folder.findByPk(req.params.id)

    if (!folder) {
        return res.status(404).json({ error: "File not found" });
    }

    await folder.destroy().then(() => {
        return res.status(200).json({ msg: "Folder deleted successfully" });
    }).catch((err) => {
        return res.status(500).json({ msg: "Failed to delete folder", err:err });
    })
}

async function moveFolder(req, res) {

}

async function copyFolder(req, res) {

}

async function listFolders(params) {

}

module.exports = {
    createRootDir,
    createFolder,
    deleteFolder,
    moveFolder,
    copyFolder,
    listFolders
}