const File = require("../models/file")
const Folder = require("../models/folder")
const SharedItem = require("../models/sharedItem")

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

module.exports = {
    sharedItem,
    revokeShare,
    saveSharedItem,
    listSharedWithMe,
    listPendingNotifications,
    declineShare,
    listTrash
}