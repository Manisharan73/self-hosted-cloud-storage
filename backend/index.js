const express = require("express")
require('dotenv').config()
const cors = require('cors')
const http = require('http')
const {Server} = require("socket.io")
const cookieParser = require('cookie-parser')

const { logHandler } = require("./middlewares/log")
const { jwtAuth } = require("./middlewares/auth")

const fileRouter = require("./routes/file")
const authRouter = require("./routes/auth")
const folderRouter = require("./routes/folder")
const userRouter = require("./routes/user")
const {initSocket} = require("./services/socket")
require("./services/cron")

const app = express()
const server = http.createServer(app)
const PORT = 3001

initSocket(server)

app.use(
    cors({
        origin: [
            'http://localhost:5173',
            'http://100.116.29.119:5173',
            'http://100.76.246.47:5173',
            'https://self-hosted-cloud-storage-p6j711cvy.vercel.app'
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
))
app.use(express.static(__dirname))
app.use(express.json())
app.use(logHandler(process.env.LOGS_FILENAME))
app.use(cookieParser())

const sequelize = require('./services/sequelize')
require('./models/associations')

async function initDb() {
    try {
        await sequelize.authenticate()
        console.log('Sequelize connected')



        await sequelize.sync()
    } catch (err) {
        console.error('DB connection failed:', err)
    }
}

app.use((req, res, next) => {
    console.log(req.method, req.url)
    next()
})

app.use("/file", jwtAuth, fileRouter)
app.use("/folder", jwtAuth, folderRouter)
app.use("/auth", authRouter)
app.use("/user", jwtAuth, userRouter)
app.use("/test", jwtAuth, (req, res) => {
    console.log(req.user)
    res.send("Hello world")
})

initDb().then(() => {
    server.listen(3001, () => {
        console.log(`Server is listening on port http://localhost:${PORT}`)
    })
})