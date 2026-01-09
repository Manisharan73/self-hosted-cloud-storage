const express = require("express")
require('dotenv').config();

const { logHandler } = require("./middlewares/log")
const {connectMongoDB} = require("./connection")

const fileRouter = require("./routes/file")

const app = express()
const PORT = 3001

connectMongoDB(process.env.MONGODB_URL)

app.use(express.static(__dirname))
app.use(express.json())
app.use(logHandler(process.env.LOGS_FILENAME))

app.use("/file", fileRouter)

app.listen(3001, () => {
    console.log(`Server is listening on port http://localhost:${PORT}`)
})