const express = require("express")
const fs = require("fs")
const path = require("path")

const router = express.Router()

router.get("/download/:filename", (req, res) => {
    const uniqueName = req.query.uniqueName
    console.log(uniqueName)
    const filePath = path.join(__dirname, "uploads", uniqueName, req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ status: false, error: "File not found" });
    }
    res.download(filePath);
});

router.post("/delete", async (req, res) => {
    const { filenames, user } = req.body

    if (!user || !user.uniqueName) {
        return res.status(400).json({ status: false, msg: "User missing" })
    }

    if (!Array.isArray(filenames) || filenames.length === 0) {
        return res.status(400).json({ status: false, msg: "filenames must be an array" });
    }

    const baseDir = path.join(__dirname, "uploads", user.uniqueName);

    if (!fs.existsSync(baseDir)) {
        return res.status(404).json({ status: false, msg: "User folder not found" });
    }

    const errors = [];

    for (const filename of filenames) {
        if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
            errors.push({ filename, error: "Invalid filename" });
            continue;
        }

        const filePath = path.join(baseDir, filename);

        if (!fs.existsSync(filePath)) {
            errors.push({ filename, error: "File not found" });
            continue;
        }

        try {
            await fs.promises.unlink(filePath);
        } catch (err) {
            errors.push({ filename, error: err.message });
        }
    }

    if (errors.length > 0) {
        return res.status(207).json({
            status: false,
            msg: "Some files failed to delete",
            errors
        });
    }


    res.json({
        status: true,
        msg: "Files deleted"
    })
})

router.delete("/delete/:filename", (req, res) => {
    const user = req.body.user
    const filePath = path.join(__dirname, "uploads", user.uniqueName, req.params.filename)

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ status: false, error: "File not found" })
    }

    fs.unlink(filePath, err => {
        if (err) return res.status(500).json(err);
        res.json({ status: true, msg: "File deleted" })
    })
})

router.post("/copy/:filename", (req, res) => {
    console.log(req.body)
    const uniqueName = req.body.uniqueName
    const dir = path.join(__dirname, "uploads", uniqueName)
    const filePath = path.join(dir, req.params.filename)

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ status: false, error: "File not found" })
    }

    const desFilename = req.params.filename.split(".")[0] + "-copy." + req.params.filename.split(".")[1]

    fs.copyFile(filePath, path.join(dir, desFilename), fs.constants.COPYFILE_EXCL, (err) => {
        if (err) {
            console.log('Destination file already exists!');
        }
    })

    res.status(200).json({
        msg: "Copy successful",
        filename: desFilename
    })
})


module.exports = router