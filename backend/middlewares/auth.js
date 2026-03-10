const jwt = require("jsonwebtoken")
const User = require("../models/user")

async function jwtAuth(req, res, next) {
    let token = req.cookies?.token

    if (!token && req.headers.authorization?.toLowerCase().startsWith("bearer ")) {
        token = req.headers.authorization.split(" ")[1]
    }

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, payload) => {
        if (err) {
            return res.status(401).json({ message: "Invalid or expired token" })
        }

        try {
            const user = await User.findByPk(payload.id)

            if (!user) {
                return res.status(401).json({ message: "User not found" })
            }

            req.user = user.get({ plain: true })
            next()
        } catch (dbErr) {
            return res.status(500).json({ message: "Database error during auth" })
        }
    })
}

module.exports = { jwtAuth }