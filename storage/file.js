const express = require("express")
const fs = require("fs")
const path = require("path")

const router = express.Router()

router.get("/download/:filename", (req, res) => {
    const uniqueName = req.query.uniqueName
    console.log(uniqueName)
    const filePath = path.join(__dirname, "uploads", uniqueName, req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }
    res.download(filePath);
});

router.delete("/delete/:filename", (req, res) => {
    const user = req.body.user
    const filePath = path.join(__dirname, "uploads", user.uniqueName, req.params.filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }

    fs.unlink(filePath, err => {
        if (err) return res.status(500).json(err);
        res.json({ msg: "File deleted" });
    });
});

module.exports = router