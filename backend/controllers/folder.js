const axios = require("axios")
const Folder = require("../models/folder")
const File = require("../models/file")

async function createRootDir(userId) {
    await Folder.create({
        ownerId: userId,
        name: "root",
        parentFolderId: null
    }).then(() => {
        console.log("Root folder is created for the user")
    }).catch((err) => {
        console.log(err)
    })
}

async function copyFolderTree(sourceFolderId, targetParentId, userId) {
    const queue = [{ sourceId: sourceFolderId, targetParentId }]

    while (queue.length > 0) {
        const { sourceId, targetParentId } = queue.shift()

        const folder = await Folder.findById(sourceId)

        const newFolder = await Folder.create({
            ownerId: userId,
            name: folder.name,
            parentFolderId: targetParentId
        })

        const files = await File.find({ parentFolderId: sourceId })

        if (files.length > 0) {
            const newFiles = files.map(f => ({
                ownerId: userId,
                originalFilename: f.originalFilename,
                filename: f.filename,
                size: f.size,
                mimetype: f.mimetype,
                path: f.path,
                actualPath: f.actualPath,
                parentFolderId: newFolder._id
            }))

            await File.insertMany(newFiles) 
        }

        const subFolders = await Folder.find({ parentFolderId: sourceId })

        for (const sub of subFolders) {
            queue.push({
                sourceId: sub._id,
                targetParentId: newFolder._id
            })
        }
    }
}

async function createFolder(req, res) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: "Unauthorized" })
        }

        const { name, parentFolderId } = req.body

        if (!name) {
            return res.status(400).json({ msg: "Folder name is required" })
        }

        let finalParentId = parentFolderId

        if (!parentFolderId) {
            const rootFolder = await Folder.findOne({
                ownerId: req.user.id,
                parentFolderId: null
            })

            if (!rootFolder) {
                return res.status(404).json({ msg: "Root folder not found" })
            }

            finalParentId = rootFolder._id
        }

        await Folder.create({
            ownerId: req.user.id,
            name,
            parentFolderId: finalParentId
        })

        return res.status(201).json({
            status: true,
            msg: "Folder created successfully"
        })

    } catch (err) {
        console.error(err)
        return res.status(500).json({
            status: false,
            msg: "Folder creation failed",
            err
        })
    }
}

async function deleteFolder(req, res) {
    const folderId = req.params.id

    if (!folderId) {
        return res.status(400).json({ msg: "Folder ID is required" })
    }

    const folder = await Folder.findByPk(folderId)

    if (!folder) {
        return res.status(404).json({ error: "File not found" })
    }

    if (folder.ownerId !== req.user.id) {
        return res.status(403).json({ msg: "Forbidden" })
    }

    const files = await File.findAll({
        where: {
            parentFolderId: folder.id
        }
    })

    const filenames = files.filter(file => file.filename).map(file => file.filename)

    try {
        await axios.post(
            `${process.env.STORAGE_URL}/delete`,
            {
                filenames,
                user: req.user
            }
        )

        await folder.destroy().then(() => {
            return res.status(200).json({ msg: "Folder deleted successfully" })
        }).catch((err) => {
            return res.status(500).json({ msg: "Failed to delete folder", err: err })
        })
    } catch (err) {
        console.error("Delete error:", err)
        return res.status(500).json({
            msg: "Failed to delete files",
            error: err.message
        })
    }
}

async function moveFolder(req, res) {
    const { to, folderId } = req.body

    if (!folderId || !to) {
        return res.status(400).json({ msg: "Missing folderId or destination folder" })
    }

    const folder = await Folder.findByPk(folderId)

    if (!folder) {
        return res.status(404).json({ msg: "Folder not found" })
    }

    if (folder.ownerId !== req.user.id) {
        return res.status(403).json({ msg: "Forbidden" })
    }

    if(to === folder.parentFolderId)
        return res.status(403).json({ msg: "Folder is already is in same directery"})

    folder.parentFolderId = to
    await folder.save()
        .then(() => { return res.status(200).json({ msg: "Moved Successfully" }) })
        .catch((err) => { return res.status(500).json({ msg: "Failed to move", err: err }) })
}

async function copyFolder(req, res) {
    const { to, folderId } = req.body

    if (!folderId || !to) {
        return res.status(400).json({ msg: "Missing folderId or destination" })
    }

    const folder = await Folder.findByPk(folderId)

    if (!folder) {
        return res.status(404).json({ msg: "Folder not found" })
    }

    if (folder.ownerId !== req.user.id) {
        return res.status(403).json({ msg: "Forbidden" })
    }

    await Folder.create({
        ownerId: folder.ownerId,
        name: `${folder.name}-copy`,
        parentFolderId: to
    }).then(async (newFolder) => {
        await copyFolderTree(folderId, newFolder._id, req.user.id)
    }).then(() => res.status(200).json({
        msg: "Folder copy successful"
    })).catch((err) => res.status(500).json({
        msg: "Failed to copy",
        err: err
    }))
}

async function renameFolder(res, req) {
    try {
        const { folderId,  foldername} = req.body

        if (!folderId || !foldername) return res.status(401).json({ msg: "Folder id is required" })

        const folder = await File.findByPk(folderId)

        if (!folder) {
            return res.status(404).json({ error: "File not found" })
        }

        if (folder.ownerId !== req.user.id) {
            return res.status(403).json({ msg: "Forbidden" })
        }

        folder.originalFilename = foldername
        await folder.save()
        .then(() => { return res.status(200).json({ msg: "Renamed Successfully" }) })
        .catch((err) => { return res.status(500).json({ msg: "Failed to move", err: err }) })

    } catch (err) {
        console.error("Delete error:", err)
        return res.status(500).json({
            msg: "Failed to delete files",
            error: err.message
        })
    }
}

module.exports = {
    createRootDir,
    createFolder,
    deleteFolder,
    moveFolder,
    copyFolder,
    renameFolder
}