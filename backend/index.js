const express = require("express")
require('dotenv').config()
const cors = require('cors');
const cookieParser = require('cookie-parser')

const { logHandler } = require("./middlewares/log")
const { jwtAuth } = require("./middlewares/auth")

const fileRouter = require("./routes/file")
const authRouter = require("./routes/auth")
const folderRouter = require("./routes/folder")

const app = express()
const PORT = 3001

app.use(express.static(__dirname))
app.use(express.json())
app.use(logHandler(process.env.LOGS_FILENAME))
app.use(cookieParser())

const sequelize = require('./sequelize');

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

async function initDb() {
    try {
        await sequelize.authenticate();
        console.log('Sequelize connected');
        await sequelize.sync();
    } catch (err) {
        console.error('DB connection failed:', err);
    }
}

app.use("/file", jwtAuth, fileRouter)
app.use("/folder", jwtAuth, folderRouter)
app.use("/auth", authRouter)
app.use("/test", jwtAuth, (req, res) => {
    console.log(req.user)
    res.send("Hello world")
})


initDb().then(() => {
    app.listen(3001, () => {
        console.log(`Server is listening on port http://localhost:${PORT}`)
    })
})