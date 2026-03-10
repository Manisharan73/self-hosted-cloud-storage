const fs = require("fs").promises
const path = require("path")
const File = require("../models/file")
const Folder = require("../models/folder")
const { Op } = require("sequelize")

const getUserDir = (uniqueName) => path.join(__dirname, "..", "uploads", uniqueName)

async function uploadFile(req, res) {
    try {
        if (!req.file) return res.status(400).json({ error: "No file received" })
        if (!req.params.id) return res.status(400).json({ error: "Target folder ID required" })

        let folderID = req.params.id

        if (folderID === "root") {
            const root = await Folder.findOne({ where: { ownerId: req.user.id, parentFolderId: null } })
            if (!root) return res.status(404).json({ error: "Root folder not found" })
            folderID = root.id
        } else {
            const targetFolder = await Folder.findByPk(folderID)
            if (!targetFolder || targetFolder.ownerId !== req.user.id) {
                await fs.unlink(req.file.path).catch(() => { })
                return res.status(403).json({ error: "Invalid destination folder" })
            }
        }

        const newFile = await File.create({
            originalFilename: req.file.originalname,
            ownerId: req.user.id,
            parentFolderId: folderID,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
        })

        return res.status(201).json({ msg: "Successful", file: newFile })
    } catch (err) {
        if (req.file) await fs.unlink(req.file.path).catch(() => { })
        return res.status(500).json({ error: "Internal server error during upload" })
    }
}

async function listFiles(req, res) {
    try {
        let folderID = req.query.id

        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: "Unauthorized" })
        }

        if (folderID == "root") {
            const root = await Folder.findOne({
                where: { ownerId: req.user.id, parentFolderId: null }
            })

            if (!root) return res.status(404).json({ msg: "Root folder not found" })

            folderID = root.id
        }

        const currentFolder = await Folder.findByPk(folderID)
        if (!currentFolder) return res.status(404).json({ msg: "Folder does not exist" })

        if (currentFolder.ownerId !== req.user.id)
            return res.status(401).json({ msg: "Unauthorized access to this folder" })

        const [files, folders] = await Promise.all([
            File.findAll({ where: { ownerId: req.user.id, parentFolderId: folderID, isTrashed: viewingTrash } }),
            Folder.findAll({ where: { ownerId: req.user.id, parentFolderId: folderID, isTrashed: viewingTrash } })
        ])

        const combinedData = [
            ...folders.map(f => ({
                id: f.id,
                name: f.name,
                type: 'Folder',
                size: '---',
                date: f.updatedAt,
            })),
            ...files.map(f => ({
                id: f.id,
                name: f.originalFilename,
                type: 'File',
                size: f.size,
                date: f.updatedAt,
            }))
        ]

        res.status(200).json({
            combinedData, currentFolder,
            msg: "Successful"
        })
    }
    catch (err) {
        console.error(err)
        return res.status(500).json({ error: "DB error" })
    }
}

async function downloadFile(req, res) {
    try {
        const file = await File.findByPk(req.params.id)
        if (!file || file.ownerId !== req.user.id) return res.status(403).json({ msg: "Forbidden" })

        const filePath = path.join(getUserDir(req.user.uniqueName), file.filename)

        return res.download(filePath, file.originalFilename)
    } catch (err) {
        return res.status(500).json({ error: "Download failed" })
    }
}

async function copyFile(req, res) {
    try {
        const { id: fileId, to } = req.body
        if (!fileId || !to) return res.status(400).json({ error: "fileId and destination (to) required" })

        const file = await File.findByPk(fileId)
        if (!file || file.ownerId !== req.user.id) return res.status(404).json({ msg: "File not found" })

        const destFolder = await Folder.findByPk(to)
        if (!destFolder || destFolder.ownerId !== req.user.id) return res.status(403).json({ error: "Invalid destination" })

        const parts = file.originalFilename.split(".")
        const ext = parts.pop()
        const base = parts.join(".")
        const copyBase = `${base}-copy`

        const existing = await File.findAll({
            where: { ownerId: req.user.id, parentFolderId: to, originalFilename: { [Op.like]: `${copyBase}%` } }
        })

        let newName = `${copyBase}.${ext}`
        if (existing.length > 0) {
            let maxIndex = 0
            existing.forEach(f => {
                const match = f.originalFilename.match(/-copy\((\d+)\)/)
                if (match) maxIndex = Math.max(maxIndex, parseInt(match[1]))
                else if (f.originalFilename === `${copyBase}.${ext}`) maxIndex = Math.max(maxIndex, 0)
            })
            newName = `${copyBase}(${maxIndex + 1}).${ext}`
        }

        const newSystemName = `${Date.now()}-${newName}`
        const userDir = getUserDir(req.user.uniqueName)
        const sourcePath = path.join(userDir, file.filename)
        const destPath = path.join(userDir, newSystemName)

        await fs.access(sourcePath)
        await fs.copyFile(sourcePath, destPath)

        try {
            await File.create({
                originalFilename: newName,
                ownerId: req.user.id,
                parentFolderId: to,
                filename: newSystemName,
                size: file.size,
                mimetype: file.mimetype,
            })
            return res.status(201).json({ msg: "Successful" })
        } catch (dbErr) {
            await fs.unlink(destPath).catch(() => { })
            throw dbErr
        }
    } catch (err) {
        return res.status(500).json({ error: "Copy failed: File might be missing or DB error" })
    }
}

async function deleteFile(req, res) {
    try {
        const file = await File.findByPk(req.params.id)
        if (!file || file.ownerId !== req.user.id) return res.status(403).json({ msg: "Forbidden" })

        const filePath = path.join(getUserDir(req.user.uniqueName), file.filename)

        await fs.unlink(filePath).catch(() => console.warn("File already missing on disk"))
        await file.destroy()

        return res.json({ msg: "Deleted successfully" })
    } catch (err) {
        return res.status(500).json({ error: "Delete failed" })
    }
}

async function deleteMultipleFiles(req, res) {
    try {
        const { ids } = req.body
        const files = await File.findAll({ where: { id: ids, ownerId: req.user.id } })
        const userDir = getUserDir(req.user.uniqueName)

        for (const file of files) {
            await fs.unlink(path.join(userDir, file.filename)).catch(() => { })
            await file.destroy()
        }

        return res.json({ msg: "Batch delete successful" })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

async function renameFile(req, res) {
    try {
        const { id, name } = req.body
        if (!id || !name || name.trim() === "") return res.status(400).json({ error: "ID and valid name required" })

        const file = await File.findByPk(id)
        if (!file || file.ownerId !== req.user.id) return res.status(403).json({ msg: "Forbidden" })

        file.originalFilename = name.trim()
        await file.save()
        return res.json({ msg: "Renamed Successfully" })
    } catch (err) {
        return res.status(500).json({ error: "Rename failed" })
    }
}

async function moveFile(req, res) {
    try {
        const { id, to } = req.body
        const file = await File.findByPk(id)
        if (!file || file.ownerId !== req.user.id) return res.status(403).json({ msg: "Forbidden" })

        file.parentFolderId = to
        await file.save()
        return res.json({ msg: "Moved" })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

async function moveToTrash(req, res) {
    try {
        const file = await File.findByPk(req.params.id)
        if (!file || file.ownerId !== req.user.id) return res.status(404).json({ msg: "Not found" })

        file.isTrashed = true
        file.deletedAt = new Date()
        await file.save()
        return res.json({ msg: "Moved to Trash" })
    } catch (err) {
        return res.status(500).json({ msg: "Trash failed" })
    }
}

async function restoreItem(req, res) {
    try {
        const file = await File.findByPk(req.params.id)
        if (!file || file.ownerId !== req.user.id) return res.status(404).json({ msg: "Not found" })

        file.isTrashed = false
        file.deletedAt = null
        await file.save()
        return res.json({ msg: "Restored" })
    } catch (err) {
        return res.status(500).json({ msg: "Restore failed" })
    }
}

module.exports = {
    uploadFile,
    listFiles,
    downloadFile,
    deleteFile,
    moveFile,
    copyFile,
    deleteMultipleFiles,
    renameFile,
    moveToTrash,
    restoreItem
}