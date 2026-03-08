const axios = require("axios")
const Folder = require("../models/folder")
const File = require("../models/file")
const { Op } = require("sequelize")


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

async function copyFolderTree(sourceFolderId, targetParentId, user) {
    const queue = [{ sourceId: sourceFolderId, targetParentId }];

    while (queue.length > 0) {
        const { sourceId, targetParentId } = queue.shift();

        const files = await File.findAll({ where: { parentFolderId: sourceId } });

        for (const file of files) {
            const newSystemFilename = `${Date.now()}-${file.originalFilename}`;
            
            await axios.post(`${process.env.STORAGE_URL}/copy/${file.filename}`, {
                uniqueName: user.uniqueName,
                newFilename: newSystemFilename
            });

            await File.create({
                ownerId: user.id,
                originalFilename: file.originalFilename,
                filename: newSystemFilename,
                size: file.size,
                mimetype: file.mimetype,
                parentFolderId: targetParentId
            });
        }

        const subFolders = await Folder.findAll({ where: { parentFolderId: sourceId } });

        for (const sub of subFolders) {
            const newSubFolder = await Folder.create({
                ownerId: user.id,
                name: sub.name,
                parentFolderId: targetParentId
            });

            queue.push({
                sourceId: sub.id, 
                targetParentId: newSubFolder.id
            });
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
    try {
        const folderId = req.params.id;

        const folder = await Folder.findByPk(folderId);
        if (!folder) return res.status(404).json({ error: "Folder not found" });
        if (folder.ownerId !== req.user.id) return res.status(403).json({ msg: "Forbidden" });

        const files = await File.findAll({
            where: { parentFolderId: folderId, ownerId: req.user.id }
        });

        if (files.length > 0) {
            const filenames = files.map(file => file.filename);
            
            try {
                await axios.post(`${process.env.STORAGE_URL}/delete`, {
                    filenames,
                    user: req.user
                });
            } catch (storageErr) {
                console.warn("Storage cleanup failed or files already gone, proceeding...");
            }

            await File.destroy({ where: { parentFolderId: folderId } });
        }

        await folder.destroy();

        return res.status(200).json({ msg: "Folder deleted permanently" });

    } catch (err) {
        console.error("Delete error:", err);
        return res.status(500).json({
            msg: "Failed to delete folder",
            error: err.message
        });
    }
}

async function moveFolder(req, res) {
    const { to, id: folderId } = req.body

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

    if (to === folder.parentFolderId)
        return res.status(403).json({ msg: "Folder is already is in same directery" })

    folder.parentFolderId = to
    await folder.save()
        .then(() => { return res.status(200).json({ msg: "Moved Successfully" }) })
        .catch((err) => { return res.status(500).json({ msg: "Failed to move", err: err }) })
}

async function copyFolder(req, res) {
    try {
        const { to, id: folderId } = req.body;

        if (!folderId || !to) {
            return res.status(400).json({ msg: "Missing folderId or destination" });
        }

        const sourceFolder = await Folder.findByPk(folderId);

        if (!sourceFolder || sourceFolder.ownerId !== req.user.id) {
            return res.status(404).json({ msg: "Folder not found or unauthorized" });
        }

        const copyBase = `${sourceFolder.name}-copy`;
        const existingFolders = await Folder.findAll({
            where: {
                ownerId: req.user.id,
                parentFolderId: to,
                name: { [Op.like]: `${copyBase}%` }
            }
        });

        let newName = copyBase;
        if (existingFolders.length > 0) {
            let maxIndex = 0;
            const escapedBase = copyBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`${escapedBase}\\((\\d+)\\)$`);

            existingFolders.forEach(f => {
                if (f.name === copyBase) {
                    maxIndex = Math.max(maxIndex, 0);
                } else {
                    const match = f.name.match(pattern);
                    if (match) maxIndex = Math.max(maxIndex, parseInt(match[1]));
                }
            });
            newName = maxIndex === 0 && !existingFolders.some(f => f.name === copyBase) 
                ? copyBase 
                : `${copyBase}(${maxIndex + 1})`;
        }

        const newFolder = await Folder.create({
            ownerId: req.user.id,
            name: newName,
            parentFolderId: to
        });

        await copyFolderTree(folderId, newFolder.id, req.user);

        return res.status(200).json({ msg: "Folder copy successful", folder: newFolder });
        
    } catch (err) {
        console.error("Folder Copy Error:", err);
        return res.status(500).json({ msg: "Failed to copy folder", err: err.message });
    }
}

async function renameFolder(req, res) {
    try {
        const { id: folderId, name: foldername } = req.body;

        if (!folderId || !foldername) {
            return res.status(400).json({ msg: "Folder ID and name are required" });
        }

        const folder = await Folder.findByPk(folderId);

        if (!folder) {
            return res.status(404).json({ error: "Folder not found" });
        }

        if (folder.ownerId !== req.user.id) {
            return res.status(403).json({ msg: "Forbidden" });
        }

        folder.name = foldername;
        
        await folder.save();
        
        return res.status(200).json({ msg: "Renamed Successfully" });

    } catch (err) {
        console.error("Rename error:", err);
        return res.status(500).json({
            msg: "Failed to rename folder",
            error: err.message
        });
    }
}

async function moveToTrash(req, res) {
    try {
        const id = req.params.id
        const folder = await Folder.findByPk(id)

        if(!folder || folder.ownerId != req.user.id) {
            return res.status(404).json({ msg: "Folder not found" })
        }

        folder.isTrashed = true
        folder.deletedAt = new Date()

        await folder.save()

        res.json({ msg: "Folder moved to Trash successfully" })
    } catch(err) {
        res.status(500).json({ msg: "Trash failed", error: err.message })
    }
}

async function restoreItem(req, res) {
    try {
        const folder = await Folder.findByPk(req.params.id)

        if(!folder || folder.ownerId != req.user.id) {
            return res.status(404).json({ msg: "Folder not found" })
        }

        await folder.update({
            isTrashed: false,
            deletedAt: null
        })

        res.json({ msg: "Folder restored successfully" })
    } catch(err) {
        res.status(500).json({ msg: "Restore failed" })
    }
}

module.exports = {
    createRootDir,
    createFolder,
    deleteFolder,
    moveFolder,
    copyFolder,
    renameFolder,
    moveToTrash,
    restoreItem
}