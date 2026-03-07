const express = require("express")
const router = express.Router()

const {
    sharedItem,
    revokeShare,
    saveSharedItem,
    listSharedWithMe,
    listPendingNotifications,
    declineShare,
    listTrash
} = require("../controllers/user")

router.post("/share", sharedItem)
router.get("/shared-with-me", listSharedWithMe)
router.get("/notifications", listPendingNotifications)
router.post("/share/save/:shareId", saveSharedItem)
router.post("/share/decline/:shareId", declineShare)
router.post("/share/revoke/:shareId", revokeShare)
router.get("/listTrash", listTrash)

module.exports = router