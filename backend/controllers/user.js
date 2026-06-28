const File = require("../models/file")
const Folder = require("../models/folder")
const SharedItem = require("../models/sharedItem")
const User = require("../models/user")
const path = require("path")
const axios = require("axios")
const { Op } = require('sequelize')
const sequelize = require('../services/sequelize')
const { getIO } = require('../services/socket')

async function sharedItem(req, res) {
    try {
        console.log(req.body)

        const { itemId, itemType, identifier, permission } = req.body

        if (!itemId || !itemType || !identifier) {
            return res.status(400).json({ msg: "Missing required fields" })
        }

        const type = itemType.toLowerCase()
        if (!['file', 'folder'].includes(type)) {
            return res.status(400).json({ msg: "Invalid itemType. Must be 'file' or 'folder'" })
        }

        const recipient = await User.findOne({
            where: {
                [Op.or]: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        })

        console.log(recipient)

        if (!recipient) {
            return res.status(404).json({ msg: "The user you are trying to share with does not exist" })
        }

        if (recipient.id === req.user.id) {
            return res.status(404).json({
                msg: 'You cannot share an item with yourself'
            })
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
                sharedWith: recipient.id,
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
        console.error(err)
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

        try {
            const io = getIO()
            const recipient = await User.findByPk(req.user.id)
            io.to(share.ownerId.toString()).emit("shareAccepted", {
                shareId: share.id,
                recipientName: recipient ? (recipient.username) : "Someone"
            })
        } catch (e) {
            console.error("Failed to emit shareAccepted:", e)
        }

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
        console.log(id)
        let currentFolder = null
        let sharedFolders = []
        let sharedFiles = []
        let backId = null
        let breadcrumbPath = []
        let ownerMap = new Map();

        if (!id || id === "root") {
            const sharedItems = await SharedItem.findAll({
                where: {
                    sharedWith: req.user.id,
                    status: 'active'
                }
            })

            const folderIds = sharedItems
                .filter(i => i.itemType === 'folder')
                .map(i => i.itemId)

            const fileIds = sharedItems
                .filter(i => i.itemType === 'file')
                .map(i => i.itemId)

            console.log(fileIds)

            const folderQuery = folderIds.length ? Folder.findAll({
                where: {
                    id: folderIds,
                    isTrashed: false
                }
            }) : Promise.resolve([])

            const fileQuery = fileIds.length ? File.findAll({
                where: {
                    id: fileIds,
                    isTrashed: false
                }
            }) : Promise.resolve([]);

            [sharedFolders, sharedFiles] = await Promise.all([folderQuery, fileQuery])

            const ownerIds = [
                ...new Set([
                    ...sharedFolders.map(f => f.ownerId),
                    ...sharedFiles.map(f => f.ownerId)
                ])
            ];

            const owners = ownerIds.length
                ? await User.findAll({
                    where: { id: ownerIds },
                    attributes: ["id", "name"]
                })
                : [];

            ownerMap = new Map(
                owners.map(owner => [owner.id, owner.name])
            );

            breadcrumbPath = [{ id: "root", name: "Shared With me" }]
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
                    where: {
                        parentFolderId: id,
                        isTrashed: false
                    }
                }),
                File.findAll({
                    where: {
                        parentFolderId: id,
                        isTrashed: false
                    }
                })
            ])

            const ownerIds = [
                ...new Set([
                    ...sharedFolders.map(f => f.ownerId),
                    ...sharedFiles.map(f => f.ownerId)
                ])
            ];

            const owners = ownerIds.length
                ? await User.findAll({
                    where: { id: ownerIds },
                    attributes: ["id", "name"]
                })
                : [];

            ownerMap = new Map(
                owners.map(owner => [owner.id, owner.name])
            );

            let tempId = id
            let depth = 0
            const MAX_DEPTH = 50

            while (tempId && depth < MAX_DEPTH) {
                const folder = await Folder.findByPk(tempId)
                if (!folder) break

                breadcrumbPath.unshift({ id: folder.id, name: folder.name })

                const isEntryPoint = await SharedItem.findOne({
                    where: {
                        itemId: tempId,
                        itemType: 'folder',
                        sharedWith: req.user.id,
                        status: 'active'
                    }
                })

                if (isEntryPoint) {
                    backId = "root"
                    break
                }

                tempId = folder.parentFolderId
                backId = folder.parentFolderId
                depth++
            }

            breadcrumbPath.unshift({ id: "root", name: "Shared with me" })
        }

        const combinedData = [
            ...sharedFolders.map(f => ({
                id: f.id,
                name: f.name,
                type: "Folder",
                size: "---",
                date: f.updatedAt,
                owner: ownerMap.get(f.ownerId) || "Unknown"
            })),
            ...sharedFiles.map(f => ({
                id: f.id,
                name: f.originalFilename,
                type: "File",
                size: f.size,
                date: f.updatedAt,
                owner: ownerMap.get(f.ownerId) || "Unknown"
            }))
        ]


        return res.status(200).json({
            combinedData,
            currentFolder: currentFolder ? {
                id: currentFolder.id,
                name: currentFolder.name,
                parentFolderId: backId
            } : { id: "root", parentFolderId: null },
            path: breadcrumbPath
        })

    } catch (err) {
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

async function listSharedByMe(req, res) {
    try {
        const { id } = req.query

        const shares = await SharedItem.findAll({
            where: { ownerId: req.user.id, status: 'active' }
        })

        const shareMap = new Map()
        const sharedFolderIds = new Set()

        shares.forEach(share => {
            const key = `${share.itemType}_${share.itemId}`
            if (!shareMap.has(key)) {
                shareMap.set(key, { shareCount: 0, lastSharedAt: share.updatedAt })
            }
            const info = shareMap.get(key)
            info.shareCount++
            if (new Date(share.updatedAt) > new Date(info.lastSharedAt)) {
                info.lastSharedAt = share.updatedAt
            }
            if (share.itemType === 'folder') {
                sharedFolderIds.add(share.itemId)
            }
        });

        if (!id || id === 'root') {
            const allFolders = await Folder.findAll({ where: { ownerId: req.user.id, isTrashed: false } })
            const folderTree = new Map(allFolders.map(f => [f.id, f]))

            const explicitFileIds = []
            const explicitFolderIds = []

            for (const [key, _] of shareMap.entries()) {
                const [type, strId] = key.split('_')
                if (type === 'file') explicitFileIds.push(parseInt(strId))
                else explicitFolderIds.push(parseInt(strId))
            }

            const [files, folders] = await Promise.all([
                explicitFileIds.length > 0 ? File.findAll({ where: { id: explicitFileIds, isTrashed: false } }) : [],
                explicitFolderIds.length > 0 ? Folder.findAll({ where: { id: explicitFolderIds, isTrashed: false } }) : []
            ])

            const combinedData = []

            const processItem = (item, type) => {
                let currentParentId = item.parentFolderId
                let hasSharedAncestor = false
                while (currentParentId) {
                    if (sharedFolderIds.has(currentParentId)) {
                        hasSharedAncestor = true
                        break
                    }
                    const parent = folderTree.get(currentParentId)
                    if (!parent) break
                    currentParentId = parent.parentFolderId
                }

                if (!hasSharedAncestor) {
                    const shareInfo = shareMap.get(`${type}_${item.id}`)
                    combinedData.push({
                        id: item.id,
                        name: type === 'file' ? item.originalFilename : item.name,
                        type: type === 'file' ? 'File' : 'Folder',
                        size: type === 'file' ? item.size : '---',
                        date: item.updatedAt,
                        shareCount: shareInfo.shareCount,
                        lastSharedAt: shareInfo.lastSharedAt,
                        explicitShare: true,
                        inheritedShare: false
                    })
                }
            }

            files.forEach(f => processItem(f, 'file'))
            folders.forEach(f => processItem(f, 'folder'))

            return res.status(200).json({
                combinedData,
                currentFolder: { id: "root", parentFolderId: null },
                path: [{ id: "root", name: "Shared By me" }]
            })

        } else {
            const currentFolder = await Folder.findByPk(id);
            if (!currentFolder || currentFolder.ownerId !== req.user.id || currentFolder.isTrashed) {
                return res.status(404).json({ msg: "Folder not found" });
            }

            const [childrenFolders, childrenFiles] = await Promise.all([
                Folder.findAll({ where: { parentFolderId: id, isTrashed: false } }),
                File.findAll({ where: { parentFolderId: id, isTrashed: false } })
            ]);

            const combinedData = [];

            const processChild = (item, type) => {
                const shareInfo = shareMap.get(`${type}_${item.id}`);
                combinedData.push({
                    id: item.id,
                    name: type === 'file' ? item.originalFilename : item.name,
                    type: type === 'file' ? 'File' : 'Folder',
                    size: type === 'file' ? item.size : '---',
                    date: item.updatedAt,
                    shareCount: shareInfo ? shareInfo.shareCount : 0,
                    lastSharedAt: shareInfo ? shareInfo.lastSharedAt : null,
                    explicitShare: !!shareInfo,
                    inheritedShare: true
                });
            };

            childrenFolders.forEach(f => processChild(f, 'folder'));
            childrenFiles.forEach(f => processChild(f, 'file'));

            let breadcrumbPath = [];
            let tempId = id;
            let depth = 0;
            let backId = currentFolder.parentFolderId;

            while (tempId && depth < 50) {
                const f = await Folder.findByPk(tempId);
                if (!f) break;
                breadcrumbPath.unshift({ id: f.id, name: f.name });

                if (sharedFolderIds.has(tempId)) {
                    let pId = f.parentFolderId;
                    let pHasSharedAncestor = false;
                    while (pId) {
                        if (sharedFolderIds.has(pId)) { pHasSharedAncestor = true; break; }
                        const p = await Folder.findByPk(pId);
                        if (!p) break;
                        pId = p.parentFolderId;
                    }
                    if (!pHasSharedAncestor) {
                        backId = "root";
                        break;
                    }
                }
                tempId = f.parentFolderId;
                depth++;
            }
            breadcrumbPath.unshift({ id: "root", name: "Shared by me" });

            return res.status(200).json({
                combinedData,
                currentFolder: {
                    id: currentFolder.id,
                    name: currentFolder.name,
                    parentFolderId: backId
                },
                path: breadcrumbPath
            });
        }
    } catch (err) {
        console.error("List Shared By Me Error:", err);
        return res.status(500).json({ error: "Failed to fetch shared by me items" });
    }
}

async function shareDetails(req, res) {
    try {
        const { itemType, itemId } = req.params;
        if (!['file', 'folder'].includes(itemType)) return res.status(400).json({ msg: "Invalid item type" });

        const item = itemType === 'file' ? await File.findByPk(itemId) : await Folder.findByPk(itemId);
        if (!item || item.ownerId !== req.user.id) return res.status(404).json({ msg: "Item not found" });

        const shares = await SharedItem.findAll({
            where: { itemId, itemType, ownerId: req.user.id, status: 'active' }
        });

        if (shares.length === 0) {
            return res.status(200).json({ sharedUsers: [] });
        }

        const userIds = shares.map(s => s.sharedWith);
        const users = await User.findAll({ where: { id: userIds }, attributes: ['id', 'username', 'email'] });
        const userMap = new Map(users.map(u => [u.id, u]));

        const sharedUsers = shares.map(s => {
            const u = userMap.get(s.sharedWith);
            return {
                id: u ? u.id : s.sharedWith,
                username: u ? u.username : 'Unknown',
                email: u ? u.email : 'Unknown',
                permission: s.permission,
                sharedAt: s.createdAt
            };
        });

        return res.status(200).json({ sharedUsers });
    } catch (err) {
        console.error("Share details error:", err);
        return res.status(500).json({ error: "Failed to fetch share details" });
    }
}

async function updateSharePermission(req, res) {
    console.log('Called')

    try {
        const { itemId, itemType, recipientId, permission } = req.body;
        if (!itemId || !itemType || !recipientId || !permission) {
            return res.status(400).json({ msg: "Missing required fields" });
        }

        const share = await SharedItem.findOne({
            where: { itemId, itemType, sharedWith: recipientId, ownerId: req.user.id }
        });

        if (!share) return res.status(404).json({ msg: "Share record not found or unauthorized" });

        share.permission = permission;
        await share.save();

        return res.status(200).json({ msg: "Permission updated" });
    } catch (err) {
        console.error("Update share error:", err);
        return res.status(500).json({ error: "Failed to update permission" });
    }
}

async function removeShareAccess(req, res) {
    const t = await sequelize.transaction();
    try {
        const { itemId, itemType, recipientId } = req.body;
        if (!itemId || !itemType || !recipientId) {
            await t.rollback();
            return res.status(400).json({ msg: "Missing required fields" });
        }

        const share = await SharedItem.findOne({
            where: { itemId, itemType, sharedWith: recipientId, ownerId: req.user.id },
            transaction: t
        });

        if (!share) {
            await t.rollback();
            return res.status(404).json({ msg: "Share record not found or unauthorized" });
        }

        await share.destroy({ transaction: t });
        await t.commit();
        return res.status(200).json({ msg: "Access removed successfully" });
    } catch (err) {
        await t.rollback();
        console.error("Remove share error:", err);
        return res.status(500).json({ error: "Failed to remove access" });
    }
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
    listShared,
    listSharedByMe,
    shareDetails,
    updateSharePermission,
    removeShareAccess
}