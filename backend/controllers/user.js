const File = require("../models/file")
const Folder = require("../models/folder")
const SharedItem = require("../models/sharedItem")
const User = require("../models/user")
const path = require("path")
const axios = require("axios")

async function sharedItem(req, res) {
    try {
        const { itemId, itemType, sharedWithUserId, permission } = req.body

        if (!itemId || !itemType || !sharedWithUserId) {
            return res.status(400).json({ msg: "Missing required fields" })
        }

        const type = itemType.toLowerCase()
        if (!['file', 'folder'].includes(type)) {
            return res.status(400).json({ msg: "Invalid itemType. Must be 'file' or 'folder'" })
        }

        if (sharedWithUserId == req.user.id) {
            return res.status(400).json({ msg: "You cannot share an item with yourself" })
        }

        const recipient = await User.findByPk(sharedWithUserId)
        if (!recipient) {
            return res.status(404).json({ msg: "The user you are trying to share with does not exist" })
        }

        const Model = type === 'file' ? File : Folder
        const item = await Model.findByPk(itemId)

        if (!item) {
            return res.status(404).json({ msg: "Item not found" })
        }

        if (item.ownerId !== req.user.id) {
            return res.status(403).json({ msg: "You don't have permission to share this item" })
        }

        if (item.isTrashed) {
            return res.status(400).json({ msg: "You cannot share an item that is in the Trash" })
        }

        const [share, created] = await SharedItem.findOrCreate({
            where: {
                itemId,
                itemType: type,
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
            share.status = 'active'
            share.permission = permission || 'read'
            await share.save()
        }

        const statusCode = created ? 201 : 200

        return res.status(statusCode).json({
            msg: created ? "Item shared successfully" : "Share permissions updated",
            share
        })

    } catch (err) {
        console.error("Share item error:", err)
        return res.status(500).json({ error: "Failed to share item", details: err.message })
    }
}

async function revokeShare(req, res) {
    try {
        const { shareId } = req.params

        if (!shareId) {
            return res.status(400).json({ msg: "Share ID is required" })
        }

        const share = await SharedItem.findOne({
            where: {
                id: shareId,
                [Op.or]: [
                    { ownerId: req.user.id },
                    { sharedWith: req.user.id }
                ]
            }
        })

        if (!share) {
            return res.status(404).json({ msg: "Share record not found or unauthorized" })
        }

        if (share.sharedWith === req.user.id && share.ownerId !== req.user.id) {
            await share.destroy()
            return res.status(200).json({ msg: "You have successfully removed this shared item" })
        }

        if (!share.isSavedByRecipient) {
            await share.destroy()
            return res.status(200).json({ msg: "Invitation Revoked" })
        } else {
            share.status = 'revoked'
            await share.save()
            return res.status(200).json({ msg: "Access Revoked" })
        }

    } catch (err) {
        console.error("Revoke share error:", err)
        return res.status(500).json({ error: "Failed to process revocation" })
    }
}

async function saveSharedItem(req, res) {
    try {
        const { shareId } = req.params

        if (!shareId) {
            return res.status(400).json({ msg: "Share ID is required" })
        }

        const share = await SharedItem.findOne({
            where: {
                id: shareId,
                sharedWith: req.user.id
            }
        })

        if (!share) {
            return res.status(404).json({ msg: "Share invitation not found" })
        }

        if (share.status === 'revoked') {
            return res.status(403).json({ msg: "Access to this item has been revoked by the owner" })
        }

        if (share.isSavedByRecipient) {
            return res.status(200).json({ msg: "Item is already in your shared library" })
        }

        share.isSavedByRecipient = true
        await share.save()

        return res.status(200).json({ msg: "Item saved to your shared library" })

    } catch (err) {
        console.error("Save shared item error:", err)
        return res.status(500).json({ error: "Failed to save the shared item" })
    }
}

async function listSharedWithMe(req, res) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: "Unauthorized" })
        }

        const shares = await SharedItem.findAll({
            where: {
                sharedWith: req.user.id,
                status: 'active',
                isSavedByRecipient: true
            }
        })

        if (shares.length === 0) {
            return res.status(200).json({ combinedData: [], msg: "No shared items" })
        }

        const fileIds = []
        const folderIds = []

        shares.forEach(share => {
            if (share.itemType === 'file') fileIds.push(share.itemId)
            else if (share.itemType === 'folder') folderIds.push(share.itemId)
        })

        const [files, folders] = await Promise.all([
            fileIds.length > 0 ? File.findAll({
                where: { id: fileIds, isTrashed: false },
                include: [{ model: User, as: 'owner', attributes: ['name', 'uniqueName'] }]
            }) : [],
            folderIds.length > 0 ? Folder.findAll({
                where: { id: folderIds, isTrashed: false },
                include: [{ model: User, as: 'owner', attributes: ['name', 'uniqueName'] }]
            }) : []
        ])

        const fileMap = new Map(files.map(f => [f.id, f]))
        const folderMap = new Map(folders.map(f => [f.id, f]))

        const combinedData = shares.map(share => {
            const isFile = share.itemType === 'file'
            const item = isFile ? fileMap.get(share.itemId) : folderMap.get(share.itemId)

            if (!item) return null

            return {
                id: item.id,
                shareId: share.id,
                name: isFile ? item.originalFilename : item.name,
                type: isFile ? 'File' : 'Folder',
                size: isFile ? item.size : '---',
                date: share.updatedAt, 
                permission: share.permission,
                owner: item.owner ? item.owner.name : "Unknown" 
            }
        }).filter(item => item !== null)

        return res.status(200).json({
            combinedData,
            msg: "Shared items loaded successfully"
        })

    } catch (err) {
        console.error("List Shared With Me Error:", err)
        return res.status(500).json({ error: "Failed to fetch shared items" })
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

        const allShares = [...receivedShares, ...sentShares]

        if (allShares.length === 0) {
            return res.status(200).json({ received: [], sent: [] })
        }

        const fileIds = []
        const folderIds = []
        const userIds = new Set()

        allShares.forEach(share => {
            if (share.itemType === 'file') fileIds.push(share.itemId)
            else if (share.itemType === 'folder') folderIds.push(share.itemId)

            userIds.add(share.ownerId)
            userIds.add(share.sharedWith)
        })

        const [files, folders, users] = await Promise.all([
            fileIds.length > 0 ? File.findAll({ where: { id: fileIds, isTrashed: false } }) : [],
            folderIds.length > 0 ? Folder.findAll({ where: { id: folderIds, isTrashed: false } }) : [],
            User.findAll({ 
                where: { id: Array.from(userIds) }, 
                attributes: ['id', 'name', 'uniqueName'] 
            })
        ])

        const fileMap = new Map(files.map(f => [f.id, f]))
        const folderMap = new Map(folders.map(f => [f.id, f]))
        const userMap = new Map(users.map(u => [u.id, u]))

        const formatNotifications = (shares, type) => {
            return shares.map(share => {
                const isFile = share.itemType === 'file'
                const item = isFile ? fileMap.get(share.itemId) : folderMap.get(share.itemId)

                if (!item) return null

                const targetUserId = type === 'received' ? share.ownerId : share.sharedWith
                const targetUser = userMap.get(targetUserId)

                return {
                    shareId: share.id,
                    itemId: share.itemId,
                    itemName: isFile ? item.originalFilename : item.name,
                    itemType: share.itemType,
                    targetUser: targetUser ? {
                        id: targetUser.id,
                        name: targetUser.name,
                        uniqueName: targetUser.uniqueName
                    } : { id: targetUserId, name: 'Unknown User' },
                    date: share.createdAt,
                    type: type
                }
            }).filter(item => item !== null) 
        }

        const received = formatNotifications(receivedShares, 'received')
        const sent = formatNotifications(sentShares, 'sent')

        return res.status(200).json({ received, sent })

    } catch (err) {
        console.error("List pending notifications error:", err)
        return res.status(500).json({ error: "Failed to load notifications" })
    }
}

async function declineShare(req, res) {
    try {
        const { shareId } = req.params

        if (!shareId) {
            return res.status(400).json({ msg: "Share ID is required" })
        }

        const share = await SharedItem.findOne({
            where: {
                id: shareId,
                sharedWith: req.user.id,
                status: 'active',
                isSavedByRecipient: false 
            }
        })

        if (!share) {
            return res.status(404).json({ 
                msg: "Share invitation not found, already accepted, or revoked" 
            })
        }

        await share.destroy()

        return res.status(200).json({ msg: "Invitation declined successfully" })

    } catch (err) {
        console.error("Decline share error:", err)
        return res.status(500).json({ error: "Failed to decline invitation" })
    }
}

async function listTrash(req, res) {
    try {
        const { id } = req.query
        let currentFolder = null
        let filteredFolders = []
        let filteredFiles = []
        let breadcrumbPath = []

        if (!id || id === "root") {
            const [folders, files] = await Promise.all([
                Folder.findAll({
                    where: { ownerId: req.user.id, isTrashed: true },
                    include: [{ model: Folder, as: 'parentFolder', required: false }]
                }),
                File.findAll({
                    where: { ownerId: req.user.id, isTrashed: true },
                    include: [{ model: Folder, as: 'parentFolder', required: false }]
                })
            ])

            filteredFolders = folders.filter(f => !f.parentFolder || !f.parentFolder.isTrashed)
            filteredFiles = files.filter(f => !f.parentFolder || !f.parentFolder.isTrashed)

            breadcrumbPath = [{ id: "root", name: "Trash" }]

        } else {
            currentFolder = await Folder.findByPk(id)

            if (!currentFolder || currentFolder.ownerId !== req.user.id) {
                return res.status(404).json({ msg: "Folder not found" })
            }

            if (!currentFolder.isTrashed) {
                return res.status(400).json({ msg: "This folder is not in the trash" })
            }

            [filteredFolders, filteredFiles] = await Promise.all([
                Folder.findAll({
                    where: { ownerId: req.user.id, parentFolderId: id, isTrashed: true } 
                }),
                File.findAll({
                    where: { ownerId: req.user.id, parentFolderId: id, isTrashed: true } 
                })
            ])

            let currentId = id
            let depth = 0
            const MAX_DEPTH = 50 

            while (currentId && depth < MAX_DEPTH) {
                const folder = await Folder.findByPk(currentId)

                if (!folder || folder.ownerId !== req.user.id) break

                const isActualRoot = folder.parentFolderId === null
                
                if (!isActualRoot) {
                    breadcrumbPath.unshift({
                        id: folder.id,
                        name: folder.name
                    })
                }

                currentId = folder.parentFolderId
                depth++
            }

            breadcrumbPath.unshift({
                id: "root",
                name: "Trash"
            })
        }

        const combinedData = [
            ...filteredFolders.map(f => ({
                id: f.id,
                name: f.name,
                type: 'Folder',
                size: '---',
                date: f.deletedAt || f.updatedAt
            })),
            ...filteredFiles.map(f => ({
                id: f.id,
                name: f.originalFilename,
                type: 'File',
                size: f.size,
                date: f.deletedAt || f.updatedAt
            }))
        ]

        let backId = null

        if (id && id !== "root" && currentFolder) {
            const parent = currentFolder.parentFolderId
                ? await Folder.findByPk(currentFolder.parentFolderId)
                : null

            if (!parent || !parent.isTrashed) {
                backId = "root"
            } else {
                backId = parent.id
            }
        }

        return res.status(200).json({
            combinedData,
            currentFolder: currentFolder ? {
                id: currentFolder.id,
                parentFolderId: backId,
                name: currentFolder.name
            } : {
                id: "root",
                parentFolderId: null,
                name: "Trash"
            },
            path: breadcrumbPath
        })

    } catch (err) {
        console.error("Trash Fetch Error:", err)
        return res.status(500).json({ error: "Failed to load trash contents" })
    }
}

async function sharedDownload(req, res) {
    try {
        const { fileId } = req.params

        if (!fileId) return res.status(400).json({ msg: "Enter a valid id" })

        const file = await File.findByPk(fileId)
        
        if (!file) return res.status(404).json({ msg: "File not found" })
        if (file.isTrashed) return res.status(404).json({ msg: "This file is no longer available" })

        const sharedItem = await SharedItem.findOne({ 
            where: { 
                itemId: fileId,
                itemType: 'file', 
                sharedWith: req.user.id,
                status: 'active'  
            } 
        })

        if (!sharedItem) {
            return res.status(403).json({ msg: "Forbidden: You do not have access to this file" })
        }

        const owner = await User.findByPk(file.ownerId)
        if (!owner) return res.status(404).json({ msg: "File owner not found" })

        const response = await axios.get(
            `${process.env.STORAGE_URL}/download/${file.filename}`,
            {
                responseType: "stream",
                params: {
                    uniqueName: owner.uniqueName,
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

        response.data.on('error', (streamErr) => {
            console.error("Storage stream error:", streamErr)
            if (!res.headersSent) {
                res.status(500).json({ error: "Download stream interrupted" })
            }
        })

        response.data.pipe(res)

    } catch (err) {
        console.error("Shared Download Error:", err)

        if (!res.headersSent) {
            if (err.response) {
                return res.status(err.response.status).json({ error: "Storage server error" })
            }
            res.status(500).json({ error: "Download failed" })
        }
    }
}

async function listShared(req, res) {
    try {
        const { id } = req.query
        let currentFolder = null
        let sharedFolders = []
        let sharedFiles = []
        let backId = null

        if (!id || id === "root") {
            const sharedItems = await SharedItem.findAll({
                where: { 
                    sharedWith: req.user.id,
                    status: 'active'
                }
            })

            const folderIds = sharedItems.filter(i => i.itemType === 'folder').map(i => i.itemId)
            const fileIds = sharedItems.filter(i => i.itemType === 'file').map(i => i.itemId)

            [sharedFolders, sharedFiles] = await Promise.all([
                folderIds.length ? Folder.findAll({
                    where: { id: folderIds, isTrashed: false },
                    include: [{ model: User, as: 'owner', attributes: ['name'] }]
                }) : [],
                fileIds.length ? File.findAll({
                    where: { id: fileIds, isTrashed: false },
                    include: [{ model: User, as: 'owner', attributes: ['name'] }]
                }) : []
            ])

            backId = null
        } else {
            currentFolder = await Folder.findByPk(id)

            if (!currentFolder || currentFolder.isTrashed) {
                return res.status(404).json({ msg: "Folder not found" })
            }

            const hasAccess = await checkSharedAccess(id, req.user.id)
            if (!hasAccess) {
                return res.status(403).json({ msg: "Access Denied" })
            }

            [sharedFolders, sharedFiles] = await Promise.all([
                Folder.findAll({ 
                    where: { parentFolderId: id, isTrashed: false },
                    include: [{ model: User, as: 'owner', attributes: ['name'] }]
                }),
                File.findAll({ 
                    where: { parentFolderId: id, isTrashed: false },
                    include: [{ model: User, as: 'owner', attributes: ['name'] }]
                })
            ])

            const explicitlyShared = await SharedItem.findOne({
                where: { itemId: id, sharedWith: req.user.id, status: 'active' }
            })

            backId = explicitlyShared ? "root" : currentFolder.parentFolderId
        }

        const combinedData = [
            ...sharedFolders.map(f => ({ 
                id: f.id, name: f.name, type: 'Folder', size: '---', 
                date: f.updatedAt, owner: f.owner?.name || 'Unknown' 
            })),
            ...sharedFiles.map(f => ({ 
                id: f.id, name: f.originalFilename, type: 'File', size: f.size, 
                date: f.updatedAt, owner: f.owner?.name || 'Unknown'
            }))
        ]

        return res.status(200).json({
            combinedData,
            currentFolder: currentFolder ? {
                id: currentFolder.id,
                name: currentFolder.name,
                parentFolderId: backId
            } : { id: "root", parentFolderId: null }
        })

    } catch(err) {
        console.error("Shared Fetch Error:", err)
        return res.status(500).json({ error: "Failed to fetch shared items" })
    }
}

async function checkSharedAccess(folderId, userId) {
    let currentId = folderId
    while (currentId) {
        const share = await SharedItem.findOne({
            where: { itemId: currentId, sharedWith: userId, status: 'active' }
        })
        if (share) return true

        const folder = await Folder.findByPk(currentId, { attributes: ['parentFolderId'] })
        if (!folder || !folder.parentFolderId) break
        currentId = folder.parentFolderId
    }
    return false
}

module.exports = {
    sharedItem,
    revokeShare,
    saveSharedItem,
    listSharedWithMe,
    listPendingNotifications,
    declineShare,
    listTrash,
    sharedDownload,
    listShared
}