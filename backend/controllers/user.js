const File = require("../models/file")
const Folder = require("../models/folder")
const SharedItem = require("../models/sharedItem")
const User = require("../models/user")
const path = require("path")
const axios = require("axios")

const getUserDir = (uniqueName) => path.join(__dirname, "..", "uploads", uniqueName)

async function sharedItem(req, res) {
    try {
        const { itemId, itemType, sharedWithUserId, permission } = req.body

        if (!itemId || !itemType || !sharedWithUserId) {
            return res.status(400).json({ msg: "Missing required fields" })
        }

        if (sharedWithUserId == req.user.id) {
            return res.status(400).json({ msg: "You cannot share an item with yourself" })
        }

        const Model = itemType.toLowerCase() === 'file' ? File : Folder
        const item = await Model.findByPk(itemId)

        if (!item) {
            return res.status(404).json({ msg: "Item not found" })
        }

        if (item.ownerId !== req.user.id) {
            return res.status(403).json({ msg: "You don't have permission to share this item" })
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
            share.status = 'active'
            share.permission = permission || 'read'
            await share.save()
        }

        res.status(201).json({
            msg: created ? "Item shared successfully" : "Share permissions updated",
            share
        })
    } catch (err) {
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

        if (!share) {
            return res.status(404).json({ msg: "Share record not found" })
        }

        if (!share.isSavedByRecipient) {
            await share.destroy()
            return res.json({ msg: "Invitation Revoked" })
        } else {
            share.status = 'revoked'
            await share.save()
            return res.json({ msg: "Access Revoked" })
        }
    } catch (err) {
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

        if (!share || share.status == 'revoked') {
            return res.status(403).json({ msg: "Access unavailable" })
        }

        share.isSavedByRecipient = true
        await share.save()

        res.json({ msg: "Item saved to your shared library" })
    } catch (err) {
        res.status(500).json({ error: err.message })
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

        const combinedData = await Promise.all(shares.map(async (share) => {
            const Model = share.itemType == 'file' ? File : Folder
            const item = await Model.findByPk(share.itemId)

            if (!item) {
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
    } catch (err) {
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
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

async function declineShare(req, res) {
    try {
        const { shareId } = req.params

        const share = await SharedItem.findOne({
            where: {
                id: shareId,
                sharedWith: req.user.id,
                status: 'active'
            }
        })

        if (!share) {
            return res.status(404).json({ msg: "Share record not found or already handled" })
        }

        await share.destroy()

        res.json({ msg: "Invitation declined successfully" })
    } catch (err) {
        console.error("Decline share error:", err)
        res.status(500).json({ error: err.message })
    }
}

async function listTrash(req, res) {
    try {
        const { id } = req.query;
        let currentFolder = null;
        let filteredFolders = [];
        let filteredFiles = [];
        let breadcrumbPath = [];

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
            ]);

            filteredFolders = folders.filter(f => !f.parentFolder || !f.parentFolder.isTrashed);
            filteredFiles = files.filter(f => !f.parentFolder || !f.parentFolder.isTrashed);

            breadcrumbPath = [{ id: "root", name: "Trash" }];

        } else {

            currentFolder = await Folder.findByPk(id);

            if (!currentFolder || currentFolder.ownerId !== req.user.id) {
                return res.status(404).json({ msg: "Folder not found" });
            }

            [filteredFolders, filteredFiles] = await Promise.all([
                Folder.findAll({
                    where: { ownerId: req.user.id, parentFolderId: id }
                }),
                File.findAll({
                    where: { ownerId: req.user.id, parentFolderId: id }
                })
            ]);

            // breadcrumb generation
            let currentId = id;

            while (currentId) {
                const folder = await Folder.findByPk(currentId);

                if (!folder || folder.ownerId !== req.user.id) break;

                if (folder.name !== "root") {
                    breadcrumbPath.unshift({
                        id: folder.id,
                        name: folder.name
                    })
                }

                currentId = folder.parentFolderId;
            }

            breadcrumbPath.unshift({
                id: "root",
                name: "Trash"
            });
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
        ];

        let backId = null;

        if (id && id !== "root") {
            const parent = currentFolder.parentFolderId
                ? await Folder.findByPk(currentFolder.parentFolderId)
                : null;

            if (!parent || !parent.isTrashed) {
                backId = "root";
            } else {
                backId = parent.id;
            }
        }

        res.status(200).json({
            combinedData,
            currentFolder: {
                id: id || "root",
                parentFolderId: backId
            },
            path: breadcrumbPath
        });

    } catch (err) {
        console.error("Trash Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
}

async function sharedDownload(req, res) {
    try {
        const { fileId } = req.params

        if (!fileId) return res.status(400).json({ msg: "Enter a valid id" })

        const file = await File.findByPk(fileId)
        if (!file) return res.status(404).json({ msg: "File not found" })

        const sharedItem = await SharedItem.findOne({ where: { itemId: fileId } })
        if (!sharedItem) return res.status(404).json({ error: "No shared access" })

        if (sharedItem.sharedWith !== req.user.id) {
            return res.status(403).json({ msg: "Forbidden" })
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

        response.data.pipe(res)

    } catch (err) {
        console.error("Shared Download Error:", err)
        res.status(500).json({ error: "Download failed" })
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
                where: { sharedWith: req.user.id }
            })

            const folderIds = sharedItems
                .filter(item => item.itemType.toLowerCase() === 'folder')
                .map(item => item.itemId)
                
            const fileIds = sharedItems
                .filter(item => item.itemType.toLowerCase() === 'file')
                .map(item => item.itemId)

            if (folderIds.length > 0) {
                sharedFolders = await Folder.findAll({
                    where: { id: folderIds, isTrashed: false },
                    include: [{ model: User, as: 'owner', attributes: ['name', 'uniqueName'] }]
                })
            }

            if (fileIds.length > 0) {
                sharedFiles = await File.findAll({
                    where: { id: fileIds, isTrashed: false },
                    include: [{ model: User, as: 'owner', attributes: ['name', 'uniqueName'] }]
                })
            }

            backId = null 
        } 
        
        else {
            currentFolder = await Folder.findByPk(id)

            if (!currentFolder || currentFolder.isTrashed) {
                return res.status(404).json({ msg: "Folder not found or is in trash" })
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
                where: { itemId: id, sharedWith: req.user.id }
            })

            if (explicitlyShared || !currentFolder.parentFolderId) {
                backId = "root"
            } else {
                backId = currentFolder.parentFolderId
            }
        }

        const combinedData = [
            ...sharedFolders.map(f => ({ 
                id: f.id, 
                name: f.name, 
                type: 'Folder', 
                size: '---', 
                date: f.updatedAt,
                owner: f.owner ? f.owner.name : 'Unknown' 
            })),
            ...sharedFiles.map(f => ({ 
                id: f.id, 
                name: f.originalFilename, 
                type: 'File', 
                size: f.size, 
                date: f.updatedAt,
                owner: f.owner ? f.owner.name : 'Unknown'
            }))
        ]

        res.status(200).json({
            combinedData,
            currentFolder: currentFolder ? {
                id: currentFolder.id,
                name: currentFolder.name,
                parentFolderId: backId
            } : { id: "root", parentFolderId: null }
        })

    } catch(err) {
        console.error("Shared Fetch Error:", err)
        res.status(500).json({ error: err.message })
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
    listShared
}