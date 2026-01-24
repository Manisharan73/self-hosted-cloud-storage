const jwt = require("jsonwebtoken")
const User = require("../models/user")

async function jwtAuth(req, res, next) {
    console.log("User middleware triggered");
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1]

    if (!token) {
        return res.status(401).send("Token missing")
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, payload) => {
        if (err) {
            return res.status(403).send("Invalid or expired token")
        }

        // payload = { userId, email, username }
        const user = await User.findByPk(payload.id)
        // console.log(payload, user)

        if (!user) {
            return res.status(403).send("User not found")
        }

        req.user = payload
        next()
    })
}

module.exports = { jwtAuth }