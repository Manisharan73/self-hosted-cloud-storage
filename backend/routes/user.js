const express = require("express")
const router = express.Router()

const {
    sharedItem,
    revokeShare,
    saveSharedItem,
    listSharedWithMe,
    listPendingNotifications,
    declineShare,
    listTrash,
    sharedDownload,
    listShared,
    listSharedByMe,
    shareDetails,
    updateSharePermission,
    removeShareAccess
} = require("../controllers/user")

router.post("/share", sharedItem)
router.get("/shared-with-me", listSharedWithMe)
router.get("/notifications", listPendingNotifications)
router.post("/share/save/:shareId", saveSharedItem)
router.post("/share/decline/:shareId", declineShare)
router.post("/share/revoke/:shareId", revokeShare)
router.get("/listTrash", listTrash)
router.get("/share/download/:fileId", sharedDownload)
router.get("/listShared", listShared)
router.get("/listSharedByMe", listSharedByMe)
router.get("/shareDetails/:itemType/:itemId", shareDetails)
router.patch("/share", updateSharePermission)
router.delete("/share", removeShareAccess)

module.exports = router