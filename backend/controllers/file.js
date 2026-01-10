const axios = require("axios");
const File = require("../models/file");
const FormData = require("form-data");
// const mongoose = require("mongoose");

// const URL = process.env.STORAGE_URL;

async function uploadFile(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file received" });
        }

        const formData = new FormData();
        formData.append("file", req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const headers = formData.getHeaders();
        headers["Content-Length"] = await new Promise((resolve, reject) => {
            formData.getLength((err, length) => {
                if (err) reject(err);
                resolve(length);
            });
        });

        const fileRes = await axios.post(
            `${process.env.STORAGE_URL}/upload`,
            formData,
            { headers }
        );

        await File.create({
            originalFilename: req.file.originalname,
            filename: fileRes.data.filename,
            size: fileRes.data.size,
            path: `/storage/${fileRes.data.filename}`,
            actualPath: fileRes.data.path,
            mimetype: req.file.mimetype,
        });


        return res.status(201).json({
            msg: "Successful",
            data: fileRes.data,
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function listFiles(req, res) {
    try {
        const files = await File.find({}).lean().maxTimeMS(3000);
        return res.json(files);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error" });
    }
}

async function downloadFile(req, res) {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: "Not found" });

    const response = await axios.get(
        `${process.env.STORAGE_URL}/download/${file.filename}`,
        { responseType: "stream" }
    );

    res.setHeader("Content-Type", file.mimetype);
    response.data.pipe(res);
}

async function deleteFile(req, res) {
    try {
        const file = await File.findById(req.params.id)
        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        await axios.delete(`${process.env.STORAGE_URL}/delete/${file.filename}`)

        await File.deleteOne({_id: file._id})

        res.json({msg: "File Deleted Succesfully"})
    } catch(err) {
        res.status(500).json({error: "Delete Failed"})
    }
}

module.exports = { uploadFile, listFiles, downloadFile, deleteFile };