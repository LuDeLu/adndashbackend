const notificationService = require("../services/notificationService")
const asyncHandler = require("../utils/asyncHandler")

const notificationController = {
  getUserNotifications: asyncHandler(async (req, res) => {
    console.log("Solicitud de notificaciones recibida para usuario:", req.user)
    const userId = req.user.id || req.user.userId
    console.log("Buscando notificaciones para el usuario ID:", userId)

    const notifications = await notificationService.getUserNotifications(userId)
    console.log(`Enviando ${notifications.length} notificaciones al cliente`)
    res.json(notifications)
  }),

  markAsRead: asyncHandler(async (req, res) => {
    const userId = req.user.id || req.user.userId
    const notificationId = req.params.id
    await notificationService.markAsRead(userId, notificationId)
    res.json({ message: "Notification marked as read" })
  }),

  markAllAsRead: asyncHandler(async (req, res) => {
    const userId = req.user.id || req.user.userId
    await notificationService.markAllAsRead(userId)
    res.json({ message: "All notifications marked as read" })
  }),

  deleteNotification: asyncHandler(async (req, res) => {
    const userId = req.user.id || req.user.userId
    const notificationId = req.params.id
    await notificationService.deleteNotification(userId, notificationId)
    res.json({ message: "Notification deleted" })
  }),

  createNotification: asyncHandler(async (req, res) => {
    const { userId, message, type, module, link } = req.body
    const notificationId = await notificationService.createNotification(userId, message, type, module, link)
    res.status(201).json({ id: notificationId, message: "Notification created" })
  }),
}

module.exports = notificationController

