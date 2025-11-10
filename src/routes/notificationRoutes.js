const express = require("express")
const router = express.Router()
const { authenticateToken } = require("../middleware/auth")
const notificationController = require("../controllers/notificationController")

// Rutas para notificaciones
router.get("/", authenticateToken, notificationController.getUserNotifications)
router.get("/:id/details", authenticateToken, notificationController.getNotificationDetails)
router.patch("/:id/read", authenticateToken, notificationController.markAsRead)
router.patch("/read-all", authenticateToken, notificationController.markAllAsRead)
router.delete("/:id", authenticateToken, notificationController.deleteNotification)
router.post("/", authenticateToken, notificationController.createNotification)

router.post("/mark-all-read", authenticateToken, notificationController.markAllAsRead)

module.exports = router
