const express = require("express");
const multer = require("multer");
const fs = require("fs")
const path = require("path");

const app = express();
const PORT = 3000;

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
    res.send(req.file);
});

app.get("/files", (req, res) => {
    fs.readdir("./uploads", { withFileTypes: true, recursive: true }, (err, files) => {
        // files.forEach(file => console.log(file))
        res.send(files)
    })
    // res.send(path.dirname("../storage"))
})

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

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
