const User = require("../models/user")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")

async function userLogin(req, res) {
    try {
        const { check, password } = req.body;

        if (!check || !password) {
            return res.status(401).send({
                success: false,
                msg: "All fields are required..."
            });
        }

        const user = await User.findOne({
            $or: [{ email: check }, { username: check }]
        });

        if (!user) {
            return res.status(400).send("Cannot find the user...");
        }

        const isMatch = await bcrypt.compare(password, user.passhash);
        if (!isMatch) {
            return res.status(401).send("Incorrect credentials...");
        }

        const payload = {
            id: user._id,
            username: user.username,
            email: user.email,
            name: user.name
        };

        const accessToken = jwt.sign(
            payload,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        user.token = accessToken
        user.lastAccessedAt = Date.now()
        user.save()

        res.status(200).send({
            msg: "Login successful",
            accessToken
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
}


async function userSignup(req, res) {
    try {
        const { name, username, email, password } = req.body;

        const result = await User.findOne({
            $or: [
                { email: email },
                { username: username }
            ]
        })
        if (result)
            return res.status(401).send({
                success: false,
                msg: "User already existed with username or email...."
            })

        if (!name || !username || !email || !password)
            return res.send(401).send({
                success: false,
                msg: "All fields are required..."
            })

        const passhash = await bcrypt.hash(password, 10)

        const newUser = await User.create({
            name: name,
            username: username,
            email: email,
            passhash: passhash,
            lastAccessedAt: Date.now()
        })

        res.status(201).send({
            success: true,
            msg: "Registeration successful...",
            data: newUser
        })
    } catch (err) {
        res.status(500).send("Something went wrong", err)
    }
}

const tokenValidation = async function (req, res) {
    const authheader = req.headers.authorization;

    if (!authheader || !authheader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing or invalid token" });
    }
    const token = authheader.split(" ")[1];
    try {
        const decode = jwt.verify(token, JWT_USER_PASS)
        req.user = decode;
        return res.status(200).json({
            message: "Valid token"
        })

    } catch (e) {
        return res.status(403).json({
            message: "Invalid or expired token"
        })
    }
}

module.exports = {
    userLogin,
    userSignup,
    tokenValidation,
}