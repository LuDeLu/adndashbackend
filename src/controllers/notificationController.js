const notificationService = require("../services/notificationService")
const asyncHandler = require("../utils/asyncHandler")

const notificationController = {
  getUserNotifications: asyncHandler(async (req, res) => {
    console.log("[v0] Notifications request received for user:", req.user)
    const userId = req.user.id || req.user.userId
    console.log("[v0] Fetching notifications for user ID:", userId)

    const notifications = await notificationService.getUserNotifications(userId)
    console.log(`[v0] Sending ${notifications.length} notifications to client`)
    res.json(notifications)
  }),

  getNotificationDetails: asyncHandler(async (req, res) => {
    const notificationId = req.params.id
    const details = await notificationService.getNotificationDetails(notificationId)
    res.json(details)
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

  getByPriority: asyncHandler(async (req, res) => {
    const userId = req.user.id || req.user.userId
    const { priority } = req.params
    const notifications = await notificationService.getNotificationsByPriority(userId, priority)
    res.json(notifications)
  }),

  archiveNotification: asyncHandler(async (req, res) => {
    const userId = req.user.id || req.user.userId
    const { id } = req.params
    const { reason } = req.body
    await notificationService.archiveNotification(userId, id, reason)
    res.json({ message: "Notification archived" })
  }),

  pinNotification: asyncHandler(async (req, res) => {
    const { id } = req.params
    await notificationService.pinNotification(id)
    res.json({ message: "Notification pinned" })
  }),

  executeAction: asyncHandler(async (req, res) => {
    const userId = req.user.id || req.user.userId
    const { notificationId, actionType, actionLabel } = req.body

    await notificationService.executeNotificationAction(notificationId, userId, actionType, actionLabel)

    // Broadcast action execution via WebSocket
    if (req.app.notificationWebSocket) {
      await req.app.notificationWebSocket.broadcastToUser(userId, {
        type: "action_executed",
        notificationId,
        actionType,
        status: "success",
      })
    }

    res.json({ message: "Action executed successfully" })
  }),
}

module.exports = notificationController
