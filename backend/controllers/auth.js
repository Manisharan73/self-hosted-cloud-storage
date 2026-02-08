const User = require("../models/user")
const UserVerification = require("../models/userVerification")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const { Op } = require("sequelize")
const nodemailer = require("nodemailer")
const { v4: uuidv4 } = require("uuid")
const {createRootDir} = require("./folder")
require("dotenv").config()

let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
})

transporter.verify((error, success) => {
    if (error) {
        console.log(error)
    }
    else {
        console.log(success)
    }
})

async function userLogin(req, res) {
    try {
        const { check, password } = req.body

        if (!check || !password) {
            return res.status(401).send({
                success: false,
                msg: "All fields are required..."
            })
        }

        const user = await User.findOne({
            where: {
                [Op.or]: [{ email: check }, { username: check }]
            }
        })

        if (!user) {
            return res.status(400).send("Cannot find the user...")
        }

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                msg: "Please verify your email first"
            })
        }

        const isMatch = await bcrypt.compare(password, user.passhash)
        if (!isMatch) {
            return res.status(401).send("Incorrect credentials...")
        }


        const payload = {
            id: user.id
        }

        const accessToken = jwt.sign(
            payload,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "7d" }
        )

        res.cookie("token", accessToken, {
            httpOnly: false,
            secure: false,
            sameSite: "Lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        user.token = accessToken
        user.lastAccessedAt = Date.now()
        user.save()

        res.status(200).send({
            msg: "Login successful",
            accessToken
        })

    } catch (error) {
        res.status(500).send("Server error")
    }
}

async function userSignup(req, res) {
    try {
        const { name, username, email, password } = req.body

        if (!name || !username || !email || !password) {
            return res.status(400).send({
                success: false,
                msg: "All fields are required..."
            })
        }

        const result = await User.findOne({
            where: {
                [Op.or]: [{ email }, { username }]
            }
        })

        if (result) {
            return res.status(409).send({
                success: false,
                msg: "User already exists with username or email"
            })
        }

        const passhash = await bcrypt.hash(password, 10)

        const newUser = await User.create({
            name,
            username,
            email,
            passhash,
            lastAccessedAt: new Date()
        })

        const id = newUser.id
        const uniqueString = (uuidv4() + id).replace(/-/g, "").slice(0, 15)

        newUser.uniqueName = uniqueString
        newUser.save()

        await sendVerificationEmail(
            { id: newUser.id, email: newUser.email },
            res
        )

        res.status(201).send({
            success: true,
            msg: "Registration successful",
            data: {
                id: newUser.id,
                name: newUser.name,
                username: newUser.username,
                email: newUser.email
            }
        })
    } catch (err) {
        console.error(err)
        res.status(500).send({
            success: false,
            msg: "Something went wrong"
        })
    }
}

async function userVerify(req, res) {
    try {
        const { userId, uniqueString } = req.params

        const record = await UserVerification.findOne({
            where: { userId }
        })

        if (!record) {
            return res.status(400).json({
                success: false,
                msg: "Invalid or already verified link"
            })
        }

        if (record.expiresAt < new Date()) {
            await UserVerification.destroy({ where: { userId } })
            return res.status(400).json({
                success: false,
                msg: "Verification link expired"
            })
        }

        const isMatch = await bcrypt.compare(uniqueString, record.secret)
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                msg: "Invalid verification link"
            })
        }

        await User.update(
            { isVerified: true },
            { where: { id: userId } }
        )

        await UserVerification.destroy({ where: { userId } })

        await createRootDir(userId)

        return res.status(200).json({
            success: true,
            msg: "Email verified successfully"
        })

    } catch (err) {
        console.error(err)
        return res.status(500).json({
            success: false,
            msg: "Verification failed"
        })
    }
}

const sendVerificationEmail = async ({ id, email }) => {
    const currentUrl = "http://localhost:3001/"

    const uniqueString = uuidv4() + id
    console.log(uniqueString)
    const hashedSecret = await bcrypt.hash(uniqueString, 10)

    await UserVerification.create({
        userId: id,
        secret: hashedSecret,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000)
    })

    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Verify Your Email",
        html: `
            <p>Verify your email to activate your account.</p>
            <p><b>Link expires in 6 hours.</b></p>
            <a href="${currentUrl}auth/verify/${id}/${uniqueString}">
                Verify Email
            </a>
        `
    }

    await transporter.sendMail(mailOptions)
}

module.exports = {
    userLogin,
    userSignup,
    userVerify
}