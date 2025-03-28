const { getPool } = require("../config/database")

class NotificationService {
  async getUserNotifications(userId) {
    const pool = getPool()
    try {
      console.log(`Fetching notifications for user ID: ${userId}`)

      // Verificar si la tabla existe
      const [tables] = await pool.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
      `)

      if (tables.length === 0) {
        console.log("La tabla notifications no existe")
        return []
      }

      const [rows] = await pool.query(
        `SELECT * FROM notifications 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [userId],
      )

      console.log(`Found ${rows.length} notifications for user ID: ${userId}`)
      return rows
    } catch (error) {
      console.error("Error getting user notifications:", error)
      throw new Error("Error getting notifications: " + error.message)
    }
  }

  async markAsRead(userId, notificationId) {
    const pool = getPool()
    try {
      await pool.query("UPDATE notifications SET `read` = 1 WHERE id = ? AND user_id = ?", [notificationId, userId])
    } catch (error) {
      console.error("Error marking notification as read:", error)
      throw new Error("Error updating notification: " + error.message)
    }
  }

  async markAllAsRead(userId) {
    const pool = getPool()
    try {
      await pool.query("UPDATE notifications SET `read` = 1 WHERE user_id = ?", [userId])
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      throw new Error("Error updating notifications: " + error.message)
    }
  }

  async deleteNotification(userId, notificationId) {
    const pool = getPool()
    try {
      await pool.query("DELETE FROM notifications WHERE id = ? AND user_id = ?", [notificationId, userId])
    } catch (error) {
      console.error("Error deleting notification:", error)
      throw new Error("Error deleting notification: " + error.message)
    }
  }

  async createNotification(userId, message, type, module, link = null) {
    const pool = getPool()
    try {
      console.log(`Creating notification for user ${userId}: ${message}`)
      const [result] = await pool.query(
        `INSERT INTO notifications 
         (user_id, message, type, module, link, \`read\`, created_at) 
         VALUES (?, ?, ?, ?, ?, 0, NOW())`,
        [userId, message, type, module, link],
      )
      console.log(`Notification created with ID: ${result.insertId}`)
      return result.insertId
    } catch (error) {
      console.error("Error creating notification:", error)
      throw new Error("Error creating notification: " + error.message)
    }
  }

  // Método para crear notificaciones para todos los usuarios con un rol específico
  async createNotificationForRole(roleId, message, type, module, link = null) {
    const pool = getPool()
    try {
      console.log(`Creating notifications for role ${roleId}: ${message}`)
      const [users] = await pool.query("SELECT id FROM users WHERE rol_id = ?", [roleId])
      console.log(`Found ${users.length} users with role ${roleId}`)

      for (const user of users) {
        await this.createNotification(user.id, message, type, module, link)
      }

      return users.length
    } catch (error) {
      console.error("Error creating notifications for role:", error)
      throw new Error("Error creating notifications for role: " + error.message)
    }
  }
}

module.exports = new NotificationService()

