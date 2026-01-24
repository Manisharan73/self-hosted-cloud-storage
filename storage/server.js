const express = require("express");
const multer = require("multer");
const fs = require("fs")
const path = require("path")
const fileRouter = require("./file")

const app = express();
const PORT = 3000;

app.use("/storage", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uniqueName = req.body.uniqueName
        const userFolder = path.join(__dirname, "uploads", uniqueName);

        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
        }

        cb(null, userFolder);
    },

    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(fileRouter)
app.post("/upload", upload.single("file"), (req, res) => {
    console.log(req.file)
    res.status(201).json(req.file);
});



app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
