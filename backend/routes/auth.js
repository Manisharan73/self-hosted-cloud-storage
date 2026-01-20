const express = require("express")
const {userLogin, userSignup, userVerify} = require("../controllers/auth")

const router = express.Router()

router.post("/signup", userSignup)
router.post("/login", userLogin)
router.get("/verify/:userId/:uniqueString", userVerify)

module.exports = router;