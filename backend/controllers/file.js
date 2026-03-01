const axios = require("axios")
const File = require("../models/file")
const FormData = require("form-data")
const Folder = require("../models/folder")
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
            File.findAll({ where: { ownerId: req.user.id, parentFolderId: folderID } }),
            Folder.findAll({ where: { ownerId: req.user.id, parentFolderId: folderID } })
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
        const fileId = req.params.id

        if (!fileId) return res.status(401).json({ msg: "File id is required" })

        const file = await File.findByPk(fileId)

        if (!file) {
            return res.status(404).json({ error: "File not found" })
        }

        if (file.ownerId !== req.user.id) {
            return res.status(403).json({ msg: "Forbidden" })
        }

        await axios.delete(
            `${process.env.STORAGE_URL}/delete/${file.filename}`,
            {
                data: {
                    user: req.user
                }
            }
        )

        await file.destroy()

        res.json({ msg: "File Deleted Successfully" })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Delete Failed" })
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


module.exports = {
    uploadFile,
    listFiles,
    downloadFile,
    deleteFile,
    moveFile,
    copyFile,
    deleteMultipleFiles,
    renameFile
}