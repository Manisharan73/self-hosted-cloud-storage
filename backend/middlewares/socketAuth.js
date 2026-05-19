const cookie = require('cookie')
const jwt = require("jsonwebtoken")
const User = require("../models/user")

async function socketAuth(socket, next) {
    try {
        const cookies = cookie.parse(socket.handshake.headers.cookie || "")

        let token = cookies.token

        if (!token && socket.handshake.auth?.token)
            token = socket.handshake.auth?.token

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, payload) => {
            if (err) {
                return next( new Error("Error: ", err))
            }

            try {
                const user = await User.findByPk(payload.id)

                if (!user) {
                    return next(new Error("User not found"))
                }

                socket.user = user.get({ plain: true })
                next()
            } catch (dbErr) {
                console.log(dbErr)
                return next(new Error("Database error: ", dbErr.message))
            }
        })
    } catch (err) {
        next(new Error(err.message))
    }
}

module.exports = { socketAuth }