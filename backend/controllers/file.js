const axios = require("axios")
const File = require("../models/file")
const FormData = require("form-data")
const Folder = require("../models/folder")


async function uploadFile(req, res) {
    try {
        let folderID = req.params.id

        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: "Unauthorized" })
        }

        if (!req.file) {
            return res.status(400).json({ error: "No file received" })
        }

        console.log(folderID)

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

        console.log("Authenticated user:", req.user)

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

        const fileRes = await axios.post(
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
                    msg: "Successful",
                    data: data.data,
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

        if(!req.user || !req.user.id) {
            return res.status(401).json({msg: "Unauthorized"})
        }

        if(!folderID) {
            const root = await Folder.findOne({
                where: { ownerId: req.user.id, parentFolderId: null }
            })

            if(!root) return res.status(404).json({msg: "Root folder not found"})
            
            folderID = root.id
        }

        const [files, folders, currentFolder] = await Promise.all([
            File.findAll({ where: { ownerId: req.user.id, parentFolderId: folderID } }),
            Folder.findAll({ where: { ownerId: req.user.id, parentFolderId: folderID } }),
            Folder.findByPk(folderID)
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
    catch(err) {
        console.error(err)
        return res.status(500).json({error: "DB error"})
    }
}

async function downloadFile(req, res) {
    try {
        const file = await File.findByPk(req.params.id)
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

        res.setHeader("Content-Type", file.mimetype)
        res.setHeader(
            "Content-Disposition",
            `attachment filename="${file.originalFilename}"`
        )

        response.data.pipe(res)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Download failed" })
    }
}

async function deleteFile(req, res) {
    try {
        const file = await File.findByPk(req.params.id)

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

}

async function copyFile(req, res) {
    
}


module.exports = {
    uploadFile,
    listFiles,
    downloadFile,
    deleteFile,
    moveFile,
    copyFile,
    deleteMultipleFiles
}