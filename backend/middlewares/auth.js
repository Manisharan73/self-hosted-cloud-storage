const jwt = require("jsonwebtoken")
const User = require("../models/user")

async function jwtAuth(req, res, next) {
    const authHeader = req.headers.authorization?.trim()

    let token = null

    if (authHeader?.toLowerCase().startsWith("bearer ")) {
        token = authHeader.split(" ")[1]
    }

    if (!token) {
        token = req.cookies?.token
    }

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, payload) => {
        if (err) {
            return res.status(403).send("Invalid or expired token")
        }

        console.log("User middleware triggered");

        const user = await User.findByPk(payload.id)

        if (!user) {
            return res.status(403).send("User not found")
        }

        req.user = user.get({ plain: true })
        next()
    })
}

module.exports = { jwtAuth }