const axios = require("axios");
const FormData = require("form-data");

const URL = process.env.STORAGE_URL;

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

        // 🔥 THIS FIXES THE INFINITE LOADING
        headers["Content-Length"] = await new Promise((resolve, reject) => {
            formData.getLength((err, length) => {
                if (err) reject(err);
                resolve(length);
            });
        });

        const fileRes = await axios.post(
            `${URL}/upload`,
            formData,
            {
                headers,
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            }
        );

        return res.status(201).json({
            msg: "Successful",
            data: fileRes.data,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: err.response?.data || err.message,
        });
    }
}

module.exports = { uploadFile };
