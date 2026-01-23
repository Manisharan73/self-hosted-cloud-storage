const express = require("express")
require('dotenv').config();

const { logHandler } = require("./middlewares/log")
const { jwtAuth } = require("./middlewares/auth")

const fileRouter = require("./routes/file")
const authRouter = require("./routes/auth")

const app = express()
const PORT = 3001

app.use(express.static(__dirname))
app.use(express.json())
app.use(logHandler(process.env.LOGS_FILENAME))

const sequelize = require('./sequelize');

const cors = require('cors');

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

app.use("/file", fileRouter)
app.use("/auth", authRouter)
app.use("/test", jwtAuth, (req, res) => {
    console.log(req.user)
    res.send("Hello world")
})

initDb()

app.get("/test", async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM test_connection');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Database Error');
    }
})


app.listen(3001, () => {
    console.log(`Server is listening on port http://localhost:${PORT}`)
})