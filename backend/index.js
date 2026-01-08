const express = require("express")
const multer = require("multer")
const fs = require("fs")
const path = require("path")

const {connectMongoDB} = require("./connection")

const app = express()
const PORT = 3001

connectMongoDB("mongodb+srv://cluster0.cpu0429.mongodb.net/selfHostedCloudStorage")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "/uploads")
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname)
    }
})

const upload = multer({ storage })

app.use(express.static(__dirname));
app.use(express.json())

app.get("/files", (req, res) => {
    
    fs.readdir("../storage", { withFileTypes: true, recursive: true }, (err, files) => {
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
        console.log("Copied successfully")
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

app.post("/upload", upload.single("file"), (req, res) => {
    res.send(req.file);
});

app.listen(3001, () => {
    console.log(`Server is listening on port http://localhost${PORT}`)
})