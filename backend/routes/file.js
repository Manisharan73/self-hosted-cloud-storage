const express = require("express")
const { uploadFile } = require("../controllers/file") 
const upload = require("../middlewares/multer")
const { listFiles, downloadFile, deleteFile } = require("../controllers/file")
    
const router = express.Router()

router.post("/upload", upload.single("file"), uploadFile);
router.get("/list", listFiles);
router.get("/download/:id", downloadFile);
router.get("/delete/:id", deleteFile)

// app.get("/files", (req, res) => {    
//     fs.readdir("../storage", { withFileTypes: true, recursive: true }, (err, files) => {
//         // files.forEach(file => console.log(file))
//         res.send(files)
//     })
//     // res.send(path.dirname("../storage"))
// })

// app.post("/move", (req, res) => {
//     const {curDir, filename, desDir} = req.body

    

//     fs.cp(`${curDir}/${filename}`, `${desDir}/${filename}`, () => {
//         console.log("moved successfully")
//         fs.rm(`${curDir}/${filename}`, () => {})
//     })
    
//     res.send("Moved Successfully")
// })

// app.post("/copy", (req, res) => {
//     const {curDir, filename, desDir} = req.body

//     fs.cp(`${curDir}/${filename}`, `${desDir}/${filename}`, () => {
//         console.log("Copied successfully")
//         // fs.rm(`${curDir}/${filename}`, () => {})
//     })
    
//     res.send("Copied Successfully")
// })

// app.post("/remove", (req, res) => {
//     const {curDir, filename} = req.body

//     fs.rm(`${curDir}/${filename}`, () => {
//         console.log("Removed successfully")
//         res.send("Removed Successfully")
//     })
    
// })

module.exports = router