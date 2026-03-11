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

        const existingFile = await File.findOne({
            where: {
                ownerId: req.user.id,
                parentFolderId: folderID,
                originalFilename: req.file.originalname,
                isTrashed: false 
            }
        })

        if (existingFile) {
            await fs.unlink(req.file.path).catch(() => { })
            
            return res.status(400).json({ 
                error: "A file with this name already exists in this directory" 
            })
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

async function downloadFile(req, res) {
    try {
        const file = await File.findByPk(req.params.id)
        
        if (!file || file.ownerId !== req.user.id) {
            return res.status(404).json({ msg: "File not found or unauthorized" })
        }

        const filePath = path.join(getUserDir(req.user.uniqueName), file.filename)

        res.download(filePath, file.originalFilename, (err) => {
            if (err) {
                console.error("Express Download Error:", err)
                
                if (!res.headersSent) {
                    res.status(404).json({ msg: "Physical file is missing from the server disk" })
                }
            }
        })

    } catch (err) {
        console.error("Download controller error:", err)
        if (!res.headersSent) {
            return res.status(500).json({ error: "Download failed", details: err.message })
        }
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

        const originalExt = path.extname(file.originalFilename) 
        const originalBase = path.basename(file.originalFilename, originalExt) 

        const copyBase = `${originalBase}-copy`

        let finalName = `${copyBase}${originalExt}`
        let nameCounter = 1

        while (true) {
            const existingFile = await File.findOne({
                where: {
                    ownerId: req.user.id,
                    parentFolderId: to,
                    originalFilename: finalName,
                    isTrashed: false
                }
            })

            if (!existingFile) break 
            finalName = `${copyBase} (${nameCounter})${originalExt}`
            nameCounter++
        }

        const newSystemName = `${Date.now()}-${finalName}`
        const userDir = getUserDir(req.user.uniqueName) 
        
        const sourcePath = path.join(userDir, file.filename)
        const destPath = path.join(userDir, newSystemName)

        await fs.access(sourcePath)
        await fs.copyFile(sourcePath, destPath)

        try {
            const newFile = await File.create({
                originalFilename: finalName,
                ownerId: req.user.id,
                parentFolderId: to,
                filename: newSystemName,
                size: file.size,
                mimetype: file.mimetype,
            })
            
            return res.status(201).json({ msg: "Successful", file: newFile })
            
        } catch (dbErr) {
            await fs.unlink(destPath).catch(() => { })
            throw dbErr 
        }

    } catch (err) {
        console.error("Copy File Error:", err)
        return res.status(500).json({ error: "Copy failed: File might be missing from disk or DB error" })
    }
}

async function deleteFile(req, res) {
    try {
        const file = await File.findByPk(req.params.id)
        
        if (!file) return res.status(404).json({ msg: "File not found" })
        if (file.ownerId !== req.user.id) return res.status(403).json({ msg: "Forbidden" })

        const filePath = path.join(getUserDir(req.user.uniqueName), file.filename)

        await fs.unlink(filePath).catch(() => console.warn("File already missing on disk"))

        await SharedItem.destroy({
            where: { itemId: file.id, itemType: 'file' } 
        }).catch((err) => console.error("Failed to clean up shared items:", err))

        await file.destroy()

        return res.json({ msg: "Deleted successfully" })
        
    } catch (err) {
        console.error("Delete file error:", err)
        return res.status(500).json({ error: "Delete failed", details: err.message })
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
        if (!id || !name || name.trim() === "") {
            return res.status(400).json({ error: "ID and valid name required" })
        }

        const file = await File.findByPk(id)
        
        if (!file) return res.status(404).json({ error: "File not found" })
        if (file.ownerId !== req.user.id) return res.status(403).json({ msg: "Forbidden" })

        const originalExt = path.extname(file.originalFilename) 
        let sanitizedName = name.trim()

        if (originalExt && !sanitizedName.endsWith(originalExt)) {
            sanitizedName += originalExt
        }

        if (file.originalFilename === sanitizedName) {
            return res.status(200).json({ msg: "Renamed Successfully" })
        }

        const existingFile = await File.findOne({
            where: {
                ownerId: req.user.id,
                parentFolderId: file.parentFolderId, 
                originalFilename: sanitizedName,
                isTrashed: false
            }
        })

        if (existingFile) {
            return res.status(400).json({ 
                error: "A file with this name already exists in this directory" 
            })
        }

        file.originalFilename = sanitizedName
        await file.save()
        
        return res.json({ msg: "Renamed Successfully" })

    } catch (err) {
        console.error("Rename file error:", err)
        return res.status(500).json({ error: "Rename failed, internal server error" })
    }
}

async function moveFile(req, res) {
    try {
        const { id: fileId, to } = req.body

        if (!fileId || to === undefined) {
            return res.status(400).json({ msg: "Missing fileId or destination folder" })
        }

        const file = await File.findByPk(fileId)

        if (!file) return res.status(404).json({ msg: "File not found" })
        if (file.ownerId !== req.user.id) return res.status(403).json({ msg: "Forbidden" })

        if (file.parentFolderId === to) {
            return res.status(400).json({ msg: "File is already in the destination directory" })
        }

        let targetFolderId = to

        if (to === "root") {
            const root = await Folder.findOne({ where: { ownerId: req.user.id, parentFolderId: null } })
            if (!root) return res.status(404).json({ msg: "Root folder not found" })
            targetFolderId = root.id
        } else {
            const destFolder = await Folder.findByPk(to)
            if (!destFolder) return res.status(404).json({ msg: "Destination folder not found" })
            if (destFolder.ownerId !== req.user.id) return res.status(403).json({ msg: "Forbidden destination" })
            targetFolderId = to
        }

        const existingFile = await File.findOne({
            where: {
                ownerId: req.user.id,
                parentFolderId: targetFolderId,
                originalFilename: file.originalFilename,
                isTrashed: false
            }
        })

        if (existingFile) {
            return res.status(400).json({ 
                msg: "A file with this name already exists in the destination directory" 
            })
        }

        file.parentFolderId = targetFolderId
        await file.save()

        return res.status(200).json({ msg: "Moved successfully" })

    } catch (err) {
        console.error("Move file error:", err)
        return res.status(500).json({ error: "Failed to move file", details: err.message })
    }
}

async function moveToTrash(req, res) {
    try {
        const file = await File.findByPk(req.params.id)
        
        if (!file) {
            return res.status(404).json({ msg: "File not found" })
        }
        if (file.ownerId !== req.user.id) {
            return res.status(403).json({ msg: "Forbidden" })
        }

        file.isTrashed = true
        file.deletedAt = new Date()
        await file.save()

        return res.json({ msg: "Moved to Trash" })
        
    } catch (err) {
        console.error("Trash file error:", err)
        return res.status(500).json({ msg: "Trash failed", error: err.message })
    }
}

async function restoreItem(req, res) {
    try {
        const file = await File.findByPk(req.params.id)
        
        if (!file || file.ownerId !== req.user.id) {
            return res.status(404).json({ msg: "File not found" })
        }

        let targetParentId = file.parentFolderId

        if (targetParentId) {
            const parentFolder = await Folder.findByPk(targetParentId)
            
            if (!parentFolder || parentFolder.isTrashed) {
                targetParentId = null 
            }
        }

        const originalExt = path.extname(file.originalFilename) 
        const originalBase = path.basename(file.originalFilename, originalExt) 
        
        let finalName = file.originalFilename
        let nameCounter = 1

        while (true) {
            const existingFile = await File.findOne({
                where: {
                    ownerId: req.user.id,
                    parentFolderId: targetParentId,
                    originalFilename: finalName,
                    isTrashed: false
                }
            })

            if (!existingFile) break 
            
            finalName = `${originalBase} (Restored ${nameCounter})${originalExt}`
            nameCounter++
        }

        file.originalFilename = finalName
        file.parentFolderId = targetParentId
        file.isTrashed = false
        file.deletedAt = null
        
        await file.save()

        return res.json({ 
            msg: "Restored successfully",
            restoredToRoot: targetParentId !== file.parentFolderId,
            renamedTo: finalName !== file.originalFilename ? finalName : null
        })

    } catch (err) {
        console.error("Restore file error:", err)
        return res.status(500).json({ msg: "Restore failed", error: err.message })
    }
}

async function getFolderPath(folderID, userId) {
    const path = [];
    let currentId = folderID;
    let depth = 0;
    const MAX_DEPTH = 50; 

    if (!currentId || currentId === "root") {
        return [{ id: "root", name: "My Storage" }];
    }

    while (currentId && depth < MAX_DEPTH) {
        const folder = await Folder.findByPk(currentId, {
            attributes: ['id', 'name', 'parentFolderId', 'ownerId']
        });

        if (!folder || folder.ownerId !== userId) break;

        const isActualRoot = folder.parentFolderId === null;

        path.unshift({
            id: isActualRoot ? "root" : folder.id, 
            name: isActualRoot ? "My Storage" : folder.name
        });

        currentId = folder.parentFolderId;
        depth++;
    }

    return path;
}

async function listFiles(req, res) {
    try {
        let folderID = req.query.id || "root"; 
        const viewingTrash = req.query.view === 'trash';

        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: "Unauthorized" });
        }

        let currentFolder = null;
        let pathTrail = [];
        let files = [];
        let folders = [];

        if (viewingTrash) {
            [files, folders] = await Promise.all([
                File.findAll({ where: { ownerId: req.user.id, isTrashed: true } }),
                Folder.findAll({ where: { ownerId: req.user.id, isTrashed: true } })
            ]);

            pathTrail = [{ id: "trash", name: "Trash" }];
            
        } else {
            if (folderID === "root") {
                const root = await Folder.findOne({
                    where: { ownerId: req.user.id, parentFolderId: null }
                });
                if (!root) return res.status(404).json({ msg: "Root folder not found" });
                folderID = root.id;
            }

            [currentFolder, pathTrail] = await Promise.all([
                Folder.findByPk(folderID),
                getFolderPath(folderID, req.user.id)
            ]);

            if (!currentFolder) return res.status(404).json({ msg: "Folder does not exist" });
            
            if (currentFolder.ownerId !== req.user.id) {
                return res.status(403).json({ msg: "Forbidden access to this folder" }); 
            }

            [files, folders] = await Promise.all([
                File.findAll({ where: { ownerId: req.user.id, parentFolderId: folderID, isTrashed: false } }),
                Folder.findAll({ where: { ownerId: req.user.id, parentFolderId: folderID, isTrashed: false } })
            ]);
        }

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
        ];

        res.status(200).json({
            combinedData, 
            currentFolder: currentFolder || { id: "trash", name: "Trash" }, 
            path: pathTrail,
            msg: "Successful"
        });

    } catch (err) {
        console.error("List files error:", err);
        return res.status(500).json({ error: "Failed to list contents" });
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
    restoreItem,
    getFolderPath
}