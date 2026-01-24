const axios = require("axios");
const File = require("../models/file");
const FormData = require("form-data");
const Folder = require("../models/folder")
// const mongoose = require("mongoose");

// const URL = process.env.STORAGE_URL;

async function uploadFile(req, res) {
    try {
        let folderID = req.params.id
        if (!req.file) {
            return res.status(400).json({ error: "No file received" });
        }

        if (!folderID) {
            const folder = await Folder.findOne({
                where: {
                    ownerId: req.user.id,
                    parentFolderId: null
                }
            })
            folderID = folder.id
        } 

        console.log("Authenticated user:", req.user);

        const formData = new FormData();
        formData.append("uniqueName", req.user.uniqueName);
        formData.append("file", req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });


        const headers = {
            ...formData.getHeaders(),
            "Content-Length": await new Promise((resolve, reject) => {
                formData.getLength((err, length) => {
                    if (err) reject(err);
                    resolve(length);
                });
            })
        };

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
                });
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
        return res.status(500).json({ error: err.message });
    }
}

async function listFiles(req, res) {
    try {
        const files = await File.findAll({
            raw: true
        });
        return res.json(files);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error" });
    }
}

async function downloadFile(req, res) {
    try {
        const file = await File.findByPk(req.params.id);
        if (!file) {
            return res.status(404).json({ error: "Not found" });
        }

        const response = await axios.get(
            `${process.env.STORAGE_URL}/download/${file.filename}`,
            {
                responseType: "stream",
                params: {
                    uniqueName: req.user.uniqueName,
                },
            }
        );

        res.setHeader("Content-Type", file.mimetype);
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${file.originalFilename}"`
        );

        response.data.pipe(res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Download failed" });
    }
}

async function deleteFile(req, res) {
    try {
        const file = await File.findByPk(req.params.id);

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        await axios.delete(
            `${process.env.STORAGE_URL}/delete/${file.filename}`,
            {
                data: {
                    user: req.user
                }
            }
        );

        await file.destroy();

        res.json({ msg: "File Deleted Successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Delete Failed" });
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
    copyFile
}