const express = require("express");
const multer = require("multer");
const fs = require("fs")
const path = require("path");

const app = express();
const PORT = 3000;

app.use("/storage", express.static(path.join(__dirname, "uploads")));

// Storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// Serve the HTML file
app.use(express.static(__dirname));

// Upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
    console.log(req.file)
    res.status(201).json(req.file);
});

app.get("/files", (req, res) => {
    fs.readdir("./uploads", (err, files) => {
        if (err) return res.status(500).json(err);
        res.json(files.map(f => ({
            name: f,
            url: `/storage/${f}`
        })));
    });
});

app.post("/move", (req, res) => {
    const {curDir, filename, desDir} = req.body

    fs.cp(`${curDir}/${filename}`, `${desDir}/${filename}`, () => {
        console.log("moved successfully")
        fs.rm(`${curDir}/${filename}`, () => {})
    })
    
    res.send("Moved Successfully")
})

app.post("/copy", (req, res) => {
    const {curDir, filename, desDir} = req.body

    fs.cp(`${curDir}/${filename}`, `${desDir}/${filename}`, () => {
        console.log("copied successfully")
        // fs.rm(`${curDir}/${filename}`, () => {})
    })
    
    res.send("Copied Successfully")
})

app.post("/remove", (req, res) => {
    const {curDir, filename} = req.body

    fs.rm(`${curDir}/${filename}`, () => {
        console.log("Removed successfully")
        res.send("Removed Successfully")
    })
})

app.get("/download/:filename", (req, res) => {
    const filePath = path.join(__dirname, "uploads", req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }
    res.download(filePath);
});

app.delete("/delete/:filename", (req, res) => {
    const filePath = path.join(__dirname, "uploads", req.params.filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }

    fs.unlink(filePath, err => {
        if (err) return res.status(500).json(err);
        res.json({ msg: "File deleted" });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
