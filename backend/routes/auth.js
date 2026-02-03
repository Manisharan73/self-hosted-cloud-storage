const express = require("express")
const {userLogin, userSignup, userVerify, tokenValidation} = require("../controllers/auth")
const {jwtAuth} =  require("../middlewares/auth")

const router = express.Router()

router.post("/signup", userSignup)
router.post("/login", userLogin)
router.get("/verify/:userId/:uniqueString", userVerify)
router.get("/token/verify", jwtAuth, tokenValidation)

module.exports = router;