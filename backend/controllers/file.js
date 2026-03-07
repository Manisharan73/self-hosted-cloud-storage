const axios = require("axios")
const File = require("../models/file")
const FormData = require("form-data")
const Folder = require("../models/folder")
const SharedItem = require("../models/sharedItem")
const { Op } = require("sequelize")

async function uploadFile(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file received" })
        }

        let folderID = req.params.id

        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: "Unauthorized" })
        }

        if (folderID == "root") {
            const folder = await Folder.findOne({
                where: {
                    ownerId: req.user.id,
                    parentFolderId: null
                }
            })
            if (!folder) return res.status(400).json({ error: "Root folder missing" })
            folderID = folder.id
        } else {
            const folder = await Folder.findByPk(folderID)
            if (!folder || folder.ownerId !== req.user.id) {
                return res.status(403).json({ msg: "Invalid folder" })
            }
        }

        const formData = new FormData()
        formData.append("uniqueName", req.user.uniqueName)
        formData.append("file", req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        })


        const headers = {
            ...formData.getHeaders(),
            "Content-Length": await new Promise((resolve, reject) => {
                formData.getLength((err, length) => {
                    if (err) reject(err)
                    resolve(length)
                })
            })
        }

        await axios.post(
            `${process.env.STORAGE_URL}/upload`,
            formData,
            { headers }
        ).then(async (result) => {
            // console.log(result)
            const data = result
            await File.create({
                originalFilename: req.file.originalname,
                ownerId: req.user.id,
                parentFolderId: folderID,
                filename: data.data.filename,
                size: data.data.size,
                mimetype: req.file.mimetype,
            }).then(() => {
                return res.status(201).json({
                    msg: "Successful"
                })
            }).catch(async (err) => {
                await axios.delete(`${process.env.STORAGE_URL}/delete/${data.data.filename}`, {
                    data: {
                        user: req.user
                    }
                })
                return res.status(500).json({
                    msg: "Upload failed",
                    err: err
                })
            })
        })
    } catch (err) {
        return res.status(500).json({ error: err.message })
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

        if (currentFolder.ownerId !== req.user.id)
            return res.status(401).json({ msg: "Unauthorized" })

        const [files, folders] = await Promise.all([
            File.findAll({ where: { ownerId: req.user.id, parentFolderId: folderID, isTrashed: false } }),
            Folder.findAll({ where: { ownerId: req.user.id, parentFolderId: folderID, isTrashed: false } })
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
        const id = req.params.id
        if (!id)
            return res.status(401).json({ msg: "Enter the valid id" })
        const file = await File.findByPk(id)
        if (!file) {
            return res.status(404).json({ error: "Not found" })
        }

        if (file.ownerId !== req.user.id) {
            return res.status(403).json({ msg: "Forbidden" })
        }

        const response = await axios.get(
            `${process.env.STORAGE_URL}/download/${file.filename}`,
            {
                responseType: "stream",
                params: {
                    uniqueName: req.user.uniqueName,
                },
            }
        )

        const fileName = encodeURIComponent(file.originalFilename)
        res.setHeader("Content-Type", file.mimetype)
        res.setHeader(
            "Content-Disposition",
            `attachment filename*=UTF-8''${fileName}`
        )
        res.setHeader("Cache-Control", "no-store")

        response.data.pipe(res)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Download failed" })
    }
}

async function deleteFile(req, res) {
    try {
        const fileId = req.params.id;
        if (!fileId) return res.status(400).json({ msg: "File id is required" });

        const file = await File.findByPk(fileId);

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        if (file.ownerId !== req.user.id) {
            return res.status(403).json({ msg: "Forbidden" });
        }

        try {
            await axios.delete(
                `${process.env.STORAGE_URL}/delete/${file.filename}`,
                { data: { user: req.user } }
            );
        } catch (storageErr) {
            console.warn("Storage service couldn't find file, proceeding with DB deletion.");
        }

        await file.destroy();

        return res.json({ msg: "File Deleted Successfully" });
    } catch (err) {
        console.error("Delete Controller Error:", err);

        return res.status(500).json({ 
            error: "Delete Failed", 
            details: err.message 
        });
    }
}

async function deleteMultipleFiles(req, res) {
    const ids = req.body.ids

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ msg: "ids array is required and cannot be empty" })
    }

    const files = await File.findAll({
        where: {
            id: ids,
            ownerId: req.user.id
        }
    })

    if (files.length === 0) {
        return res.status(404).json({ msg: "No files found" })
    }


    const filenames = files.filter(file => file.filename).map(file => file.filename)

    try {
        const result = await axios.post(
            `${process.env.STORAGE_URL}/delete`,
            {
                filenames,
                user: req.user
            }
        )

        if (result.data?.status) {
            await Promise.all(files.map(file => file.destroy()))
        }

        return res.status(200).json({ msg: "Files deleted successfully" })

    } catch (err) {
        console.error("Delete error:", err)
        return res.status(500).json({
            msg: "Failed to delete files",
            error: err.message
        })
    }

}

async function moveFile(req, res) {
    try {
        const { to, id: fileId } = req.body

        if (!fileId || !to) {
            return res.status(400).json({ msg: "Missing fileId or destination folder" })
        }

        const file = await File.findByPk(fileId)

        if (!file) {
            return res.status(404).json({ msg: "File not found" })
        }

        if (file.ownerId !== req.user.id) {
            return res.status(403).json({ msg: "Forbidden" })
        }

        if (to === file.parentFolderId) {
            return res.status(400).json({ msg: "Already in same directory" })
        }

        const parts = file.originalFilename.split(".")
        const ext = parts.pop()
        const base = parts.join(".")
        const existingFiles = await File.findAll({
            attributes: ["originalFilename"],
            where: {
                ownerId: req.user.id,
                parentFolderId: to,
                originalFilename: {
                    [Op.like]: `${base}%`
                }
            }
        })

        let newName = file.originalFilename

        if (existingFiles.length > 0) {
            const nameSet = new Set(existingFiles.map(f => f.originalFilename))

            if (nameSet.has(file.originalFilename)) {
                let maxIndex = 0

                nameSet.forEach(name => {
                    const match = name.match(/\((\d+)\)/)
                    if (match) {
                        const num = parseInt(match[1])
                        if (num > maxIndex) maxIndex = num
                    }
                })

                newName = `${base}(${maxIndex + 1}).${ext}`
            }
        }

        file.parentFolderId = to
        file.originalFilename = newName
        await file.save()
        return res.status(200).json({
            msg: "Moved Successfully",
            filename: newName
        })

    } catch (err) {
        return res.status(500).json({
            msg: "Failed to move",
            err: err.message
        })
    }
}

async function copyFile(req, res) {
    try {
        const { id: fileId, to } = req.body

        if (!fileId || !to)
            return res.status(400).json({ msg: "Missing fileId or destination folder" })

        const file = await File.findByPk(fileId)

        if (!file) {
            return res.status(404).json({ error: "File not found" })
        }

        if (file.ownerId !== req.user.id) {
            return res.status(403).json({ msg: "Forbidden" })
        }

        const result = await axios.post(
            `${process.env.STORAGE_URL}/copy/${file.filename}`,
            { uniqueName: req.user.uniqueName }
        )

        const filename = result.data.filename
        const parts = file.originalFilename.split(".")
        const ext = parts.pop()
        const base = parts.join(".")

        const copyBase = `${base}-copy`
        const existingFiles = await File.findAll({
            attributes: ["originalFilename"],
            where: {
                ownerId: req.user.id,
                parentFolderId: to,
                originalFilename: {
                    [Op.like]: `${copyBase}%`
                }
            }
        })

        let newName = `${copyBase}.${ext}`

        if (existingFiles.length > 0) {
            let maxIndex = 0

            existingFiles.forEach(f => {
                const name = f.originalFilename
                const match = name.match(/-copy\((\d+)\)/)

                if (match) {
                    const num = parseInt(match[1])
                    if (num > maxIndex) maxIndex = num
                } else if (name === `${copyBase}.${ext}`) {
                    if (maxIndex === 0) maxIndex = 1
                }
            })

            newName = `${copyBase}(${maxIndex}).${ext}`
        }

        try {
            await File.create({
                originalFilename: newName,
                ownerId: req.user.id,
                parentFolderId: to,
                filename: filename,
                size: file.size,
                mimetype: file.mimetype,
            })

            return res.status(201).json({ msg: "Successful" })

        } catch (err) {
            await axios.delete(`${process.env.STORAGE_URL}/delete/${filename}`, {
                data: { user: req.user }
            })
            return res.status(500).json({
                msg: "Upload failed",
                err: err.message
            })
        }

    } catch (err) {
        console.error("Copy error:", err)
        return res.status(500).json({
            msg: "Failed to copy file",
            error: err.message
        })
    }
}

async function renameFile(req, res) {
    try {
        const { id: fileId, name: filename } = req.body

        if (!fileId || !filename) return res.status(401).json({ msg: "File id is required" })

        const file = await File.findByPk(fileId)

        if (!file) {
            return res.status(404).json({ error: "File not found" })
        }

        if (file.ownerId !== req.user.id) {
            return res.status(403).json({ msg: "Forbidden" })
        }

        file.originalFilename = filename
        await file.save()
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

async function moveToTrash(req, res) {
    try {
        const id = req.params.id
        const file = await File.findByPk(id)

        if(!file || file.ownerId != req.user.id) {
            return res.status(404).json({ msg: "File not found" })
        }

        file.isTrashed = true;
        file.deletedAt = new Date();
        await file.save()

        res.json({ msg: "Moved to Trash successfully" })
    } catch(err) {
        res.status(500).json({ msg: "Trash Failed" })
    }
}

async function listTrash(req, res) {
    try {
        const [files ,folders] = await Promise.all([
            File.findAll({ where: { ownerId: req.user.id, isTrashed: true } }),
            Folder.findAll({ where: { ownerId: req.user.id, isTrashed: true } })
        ])

        const combinedData = [
            ...folders.map(f => ({
                id: f.id,
                name: f.name,
                type: 'Folder',
                size: '---',
                date: f.deletedAt
            })),
            ...files.map(f => ({
                id: f.id,
                name: f.originalFilename,
                type: 'File',
                size: f.size,
                date: f.deletedAt
            }))
        ]

        res.status(200).json({
            combinedData,
            msg: "Trash loaded successfully"
        })
    } catch(err) {
        res.status(500).json({ error: "Failed to fetch trash items" })
    }
}

async function restoreItem(req, res) {
    const file = await File.findByPk(req.params.id)

    await file.update({
        isTrashed: false,
        deletedAt: null
    })

    res.json({ msg: "Restored" })
}

async function sharedItem(req, res) { 
    try {
        const { itemId, itemType, sharedWithUserId, permission } = req.body

        if (!itemId || !itemType || !sharedWithUserId) {
            return res.status(400).json({ msg: "Missing required fields" });
        }

        if (sharedWithUserId == req.user.id) {
            return res.status(400).json({ msg: "You cannot share an item with yourself" });
        }

        const Model = itemType.toLowerCase() === 'file' ? File : Folder
        const item = await Model.findByPk(itemId)

        if (!item) {
            return res.status(404).json({ msg: "Item not found" });
        }

        if (item.ownerId !== req.user.id) {
            return res.status(403).json({ msg: "You don't have permission to share this item" });
        }

        const [share, created] = await SharedItem.findOrCreate({
            where: {
                itemId,
                itemType: itemType.toLowerCase(),
                sharedWith: sharedWithUserId,
                ownerId: req.user.id
            },
            defaults: {
                permission: permission || 'read',
                status: 'active',
                isSavedByRecipient: false
            }
        })

        if (!created) {
            share.status = 'active';
            share.permission = permission || 'read';
            await share.save();
        }

        res.status(201).json({ 
            msg: created ? "Item shared successfully" : "Share permissions updated", 
            share 
        })
    } catch(err) {
        res.status(500).json({ error: err.message })
    }
}

async function revokeShare(req, res) {
    try {
        const { shareId } = req.params

        const share = await SharedItem.findOne({
            where: {
                id: shareId,
                ownerId: req.user.id
            }
        })

        if(!share) {
            return res.status(404).json({ msg: "Share record not found" })
        }

        if(!share.isSavedByRecipient) {
            await share.destroy()
            return res.json({ msg: "Invitation Revoked" })
        } else {
            share.status = 'revoked'
            await share.save()
            return res.json({ msg: "Access Revoked" })
        }
    } catch(err) {
        res.status(500).json({ error: err.message })
    }
}

async function saveSharedItem(req, res) {
    try {
        const { shareId } = req.params

        const share = await SharedItem.findOne({
            where: {
                id: shareId,
                sharedWith: req.user.id
            }
        })

        if(!share || share.status == 'revoked') {
            return res.status(403).json({ msg: "Access unavailable" })
        }

        share.isSavedByRecipient = true
        await share.save()

        res.json({ msg: "Item saved to your shared library" })
    } catch(err) {
        res.status(500).json({ error: err.message })
    }
}

async function listSharedWithMe(req, res) {
    try {
        if(!req.user || !req.user.id) {
            return res.status(401).json({ msg: "Unauthorized" })
        }

        const shares = await SharedItem.findAll({
            where: {
                sharedWith: req.user.id,
                status: 'active',
                isSavedByRecipient: true
            }
        })

        const combinedData = await Promise.all(shares.map(async (share) => {
            const Model = share.itemType == 'file' ? File : Folder
            const item = await Model.findByPk(share.itemId)

            if(!item) {
                return null
            }

            return {
                id: item.id,
                shareId: share.id,
                name: share.itemType === 'file' ? item.originalFilename : item.name,
                type: share.itemType === 'file' ? 'File' : 'Folder',
                size: share.itemType === 'file' ? item.size : '---',
                date: share.sharedAt,
                permission: share.permission
            }
        }))

        const filteredData = combinedData.filter(item => item != null)

        res.status(200).json({
            combinedData: filteredData,
            msg: "Shared items loaded successfully"
        })
    } catch(err) {
        console.error(err)
        res.status(500).json({ error: "Failed to fetch shared items" })
    }
}

async function listPendingNotifications(req, res) {
    try {
        const [receivedShares, sentShares] = await Promise.all([
            SharedItem.findAll({
                where: {
                    sharedWith: req.user.id,
                    status: 'active',
                    isSavedByRecipient: false
                }
            }),

            SharedItem.findAll({
                where: {
                    ownerId: req.user.id,
                    status: 'active',
                    isSavedByRecipient: false
                }
            })
        ])

        const formatNotifications = async (shares, type) => {
            return await Promise.all(shares.map(async (share) => {
                const Model = share.itemType === 'file' ? File : Folder
                const item = await Model.findByPk(share.itemId)

                return {
                    shareId: share.id,
                    itemId: share.itemId,
                    itemName: item ? (item.originalFilename || item.name) : 'Unknown',
                    itemType: share.itemType,
                    targetUser: type === 'received' ? share.ownerId : share.sharedWith,
                    date: share.createdAt,
                    type: type
                }
            }))
        }

        const received = await formatNotifications(receivedShares, 'received')
        const sent = await formatNotifications(sentShares, 'sent')

        res.status(200).json({ received, sent })
    } catch(err) {
        res.status(500).json({ error: err.message })
    }
}

async function declineShare(req, res) {
    try {
        const { shareId } = req.params;

        const share = await SharedItem.findOne({
            where: {
                id: shareId,
                sharedWith: req.user.id,
                status: 'active'
            }
        });

        if (!share) {
            return res.status(404).json({ msg: "Share record not found or already handled" });
        }

        await share.destroy();

        res.json({ msg: "Invitation declined successfully" });
    } catch (err) {
        console.error("Decline share error:", err);
        res.status(500).json({ error: err.message });
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
    listTrash,
    sharedItem,
    revokeShare,
    saveSharedItem,
    listSharedWithMe,
    listPendingNotifications,
    declineShare
}