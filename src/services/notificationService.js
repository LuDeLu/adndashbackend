// ... existing imports and code ...
const { getPool } = require("../config/database")

class NotificationService {
  async getUserNotifications(userId) {
    const pool = getPool()
    try {
      console.log(`Fetching notifications for user ID: ${userId}`)

      const [rows] = await pool.query(
        `SELECT 
          n.id,
          n.message,
          n.type,
          n.priority,
          n.module,
          n.category,
          n.link,
          n.created_at,
          n.sent_to,
          n.is_broadcast,
          n.actionable,
          n.actions_json,
          n.pinned,
          COALESCE(nr.read_at IS NOT NULL, 0) as 'read',
          nr.read_at,
          (SELECT COUNT(*) FROM notification_recipients WHERE notification_id = n.id) as total_recipients,
          (SELECT COUNT(*) FROM notification_reads WHERE notification_id = n.id) as read_count
        FROM notifications n
        LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
        LEFT JOIN notification_recipients nrec ON n.id = nrec.notification_id AND nrec.user_id = ?
        WHERE 
          (n.sent_to = 'all') OR
          (n.sent_to = 'user' AND nrec.user_id = ?) OR
          (n.user_id = ?)
        AND n.archived = 0
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        ORDER BY n.pinned DESC, n.priority = 'critical' DESC, n.priority = 'high' DESC, n.created_at DESC
        LIMIT 100`,
        [userId, userId, userId, userId],
      )

      console.log(`Found ${rows.length} notifications for user ID: ${userId}`)
      return rows.map((row) => ({
        ...row,
        actions: row.actions_json ? JSON.parse(row.actions_json) : [],
      }))
    } catch (error) {
      console.error("Error getting user notifications:", error)
      throw new Error("Error getting notifications: " + error.message)
    }
  }

  async createNotificationAdvanced(options) {
    const pool = getPool()
    try {
      const {
        userId,
        message,
        type = "info",
        module,
        priority = "medium",
        category,
        link,
        sentTo = "user",
        roleId,
        actionable = false,
        actions = [],
        metadata = {},
        contextType,
        contextId,
        expiresAt = null,
      } = options

      const [result] = await pool.query(
        `INSERT INTO notifications 
         (user_id, message, type, priority, module, category, link, sent_to, role_id, 
          actionable, actions_json, metadata_json, context_type, context_id, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          message,
          type,
          priority,
          module,
          category || module,
          link,
          sentTo,
          roleId || null,
          actionable ? 1 : 0,
          JSON.stringify(actions),
          JSON.stringify(metadata),
          contextType,
          contextId,
          expiresAt,
        ],
      )

      const notificationId = result.insertId

      // Log sync event
      await pool.query(`INSERT INTO notification_sync (user_id, notification_id, action) VALUES (?, ?, 'created')`, [
        userId,
        notificationId,
      ])

      // Add recipients
      if (sentTo === "all") {
        await pool.query(
          `INSERT IGNORE INTO notification_recipients (notification_id, user_id)
          SELECT ?, id FROM usuarios WHERE activo = 1`,
          [notificationId],
        )
      } else if (sentTo === "role" && roleId) {
        const [users] = await pool.query(`SELECT id FROM usuarios WHERE rol_id = ? AND activo = 1`, [roleId])

        for (const user of users) {
          await pool.query(`INSERT IGNORE INTO notification_recipients (notification_id, user_id) VALUES (?, ?)`, [
            notificationId,
            user.id,
          ])
        }
      }

      return notificationId
    } catch (error) {
      console.error("Error creating notification:", error)
      throw new Error("Error creating notification: " + error.message)
    }
  }

  async getNotificationsByPriority(userId, priority) {
    const pool = getPool()
    try {
      const [notifications] = await pool.query(
        `SELECT * FROM notifications 
        WHERE (sent_to = 'all' OR user_id = ? OR EXISTS(
          SELECT 1 FROM notification_recipients WHERE notification_id = notifications.id AND user_id = ?
        ))
        AND priority = ?
        AND archived = 0
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 50`,
        [userId, userId, priority],
      )

      return notifications
    } catch (error) {
      console.error("Error getting notifications by priority:", error)
      throw new Error("Error getting notifications by priority: " + error.message)
    }
  }

  async archiveNotification(userId, notificationId, reason = null) {
    const pool = getPool()
    try {
      await pool.query(`UPDATE notifications SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
        notificationId,
      ])

      await pool.query(`INSERT INTO notification_archive (notification_id, user_id, reason) VALUES (?, ?, ?)`, [
        notificationId,
        userId,
        reason,
      ])

      await pool.query(`INSERT INTO notification_sync (user_id, notification_id, action) VALUES (?, ?, 'archived')`, [
        userId,
        notificationId,
      ])
    } catch (error) {
      console.error("Error archiving notification:", error)
      throw new Error("Error archiving notification: " + error.message)
    }
  }

  async pinNotification(notificationId) {
    const pool = getPool()
    try {
      await pool.query(`UPDATE notifications SET pinned = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
        notificationId,
      ])
    } catch (error) {
      console.error("Error pinning notification:", error)
      throw new Error("Error pinning notification: " + error.message)
    }
  }

  async executeNotificationAction(notificationId, userId, actionType, actionLabel) {
    const pool = getPool()
    try {
      await pool.query(
        `INSERT INTO notification_actions (notification_id, user_id, action_type, action_label, executed_at)
        VALUES (?, ?, ?, ?, NOW())`,
        [notificationId, userId, actionType, actionLabel],
      )

      // Mark as read
      await this.markAsRead(userId, notificationId)

      // Log activity
      console.log(`[v0] User ${userId} executed action '${actionType}' on notification ${notificationId}`)

      // Trigger business logic based on action type
      if (actionType === "approve") {
        // Handle approval logic
        const [notification] = await pool.query("SELECT context_type, context_id FROM notifications WHERE id = ?", [
          notificationId,
        ])

        if (notification.length > 0) {
          const { context_type, context_id } = notification[0]

          // Emit approval event to be handled by specific module
          if (context_type === "ticket") {
            // Trigger ticket approval logic
            const ticketApprovalEvent = require("../events/ticketApprovalEvent")
            await ticketApprovalEvent.onTicketApproved(context_id, userId)
          } else if (context_type === "reclamo") {
            // Trigger reclamo approval logic
            const reclamoApprovalEvent = require("../events/reclamoApprovalEvent")
            await reclamoApprovalEvent.onReclamoApproved(context_id, userId)
          }
        }
      } else if (actionType === "reject") {
        // Handle rejection logic
        console.log(`[v0] User ${userId} rejected action for notification ${notificationId}`)
      }
    } catch (error) {
      console.error("Error executing notification action:", error)
      throw new Error("Error executing action: " + error.message)
    }
  }

  // ... rest of existing methods ...
  async getNotificationDetails(notificationId) {
    const pool = getPool()
    try {
      console.log(`Fetching details for notification ID: ${notificationId}`)

      const [notifications] = await pool.query(
        `SELECT 
          id,
          message,
          type,
          priority,
          module,
          category,
          link,
          created_at,
          sent_to,
          is_broadcast,
          actionable,
          actions_json,
          (SELECT COUNT(*) FROM notification_recipients WHERE notification_id = ?) as total_recipients,
          (SELECT COUNT(*) FROM notification_reads WHERE notification_id = ?) as read_count
        FROM notifications 
        WHERE id = ?`,
        [notificationId, notificationId, notificationId],
      )

      if (notifications.length === 0) {
        throw new Error("Notification not found")
      }

      const [readByUsers] = await pool.query(
        `SELECT 
          u.id,
          u.nombre,
          u.email,
          u.rol,
          nr.read_at
        FROM notification_reads nr
        JOIN usuarios u ON nr.user_id = u.id
        WHERE nr.notification_id = ?
        ORDER BY nr.read_at DESC`,
        [notificationId],
      )

      const [unreadUsers] = await pool.query(
        `SELECT 
          u.id,
          u.nombre,
          u.email,
          u.rol
        FROM notification_recipients nrec
        JOIN usuarios u ON nrec.user_id = u.id
        LEFT JOIN notification_reads nr ON nrec.notification_id = nr.notification_id AND nrec.user_id = nr.user_id
        WHERE nrec.notification_id = ? AND nr.id IS NULL
        ORDER BY u.nombre ASC`,
        [notificationId],
      )

      return {
        notification: { ...notifications[0], actions: JSON.parse(notifications[0].actions_json || "[]") },
        readBy: readByUsers,
        unreadBy: unreadUsers,
      }
    } catch (error) {
      console.error("Error getting notification details:", error)
      throw new Error("Error getting notification details: " + error.message)
    }
  }

  async markAsRead(userId, notificationId) {
    const pool = getPool()
    try {
      await pool.query(
        `INSERT INTO notification_reads (notification_id, user_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP`,
        [notificationId, userId],
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
      throw new Error("Error updating notification: " + error.message)
    }
  }

  async markAllAsRead(userId) {
    const pool = getPool()
    try {
      await pool.query(
        `INSERT INTO notification_reads (notification_id, user_id)
        SELECT n.id, ?
        FROM notifications n
        LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
        WHERE nr.id IS NULL AND (
          n.sent_to = 'all' OR
          EXISTS (
            SELECT 1 FROM notification_recipients nrec 
            WHERE nrec.notification_id = n.id AND nrec.user_id = ?
          ) OR
          n.user_id = ?
        )
        ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP`,
        [userId, userId, userId, userId],
      )
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      throw new Error("Error updating notifications: " + error.message)
    }
  }

  async deleteNotification(userId, notificationId) {
    const pool = getPool()
    try {
      const [notification] = await pool.query("SELECT user_id FROM notifications WHERE id = ?", [notificationId])

      if (notification.length === 0 || notification[0].user_id !== userId) {
        throw new Error("Unauthorized to delete this notification")
      }

      await pool.query("DELETE FROM notifications WHERE id = ?", [notificationId])
    } catch (error) {
      console.error("Error deleting notification:", error)
      throw new Error("Error deleting notification: " + error.message)
    }
  }

  async createNotification(userId, message, type, module, link = null, sentTo = "user", roleId = null) {
    const pool = getPool()
    try {
      console.log(`Creating notification for user ${userId}: ${message}`)
      const [result] = await pool.query(
        `INSERT INTO notifications 
         (user_id, message, type, module, link, sent_to, role_id, is_broadcast, \`read\`, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
        [userId, message, type, module, link, sentTo, roleId, sentTo === "all" ? 1 : 0],
      )
      console.log(`Notification created with ID: ${result.insertId}`)

      if (sentTo === "all") {
        await pool.query(
          `INSERT IGNORE INTO notification_recipients (notification_id, user_id)
          SELECT ?, id FROM usuarios WHERE activo = 1`,
          [result.insertId],
        )
      }

      return result.insertId
    } catch (error) {
      console.error("Error creating notification:", error)
      throw new Error("Error creating notification: " + error.message)
    }
  }

  async createNotificationForRole(roleId, message, type, module, link = null) {
    const pool = getPool()
    try {
      console.log(`Creating notifications for role ${roleId}: ${message}`)
      const [users] = await pool.query("SELECT id FROM usuarios WHERE rol_id = ? AND activo = 1", [roleId])
      console.log(`Found ${users.length} users with role ${roleId}`)

      const notificationId = await this.createNotification(1, message, type, module, link, "role", roleId)

      for (const user of users) {
        await pool.query(
          `INSERT IGNORE INTO notification_recipients (notification_id, user_id)
          VALUES (?, ?)`,
          [notificationId, user.id],
        )
      }

      return users.length
    } catch (error) {
      console.error("Error creating notifications for role:", error)
      throw new Error("Error creating notifications for role: " + error.message)
    }
  }

  async createNotificationForUsers(userIds, message, type, module, link = null) {
    const pool = getPool()
    try {
      console.log(`Creating notification for ${userIds.length} users: ${message}`)

      const notificationId = await this.createNotification(1, message, type, module, link, "specific")

      for (const userId of userIds) {
        await pool.query(
          `INSERT IGNORE INTO notification_recipients (notification_id, user_id)
          VALUES (?, ?)`,
          [notificationId, userId],
        )
      }

      console.log(`Notification sent to ${userIds.length} users`)
      return notificationId
    } catch (error) {
      console.error("Error creating notifications for users:", error)
      throw new Error("Error creating notifications for users: " + error.message)
    }
  }
}

module.exports = new NotificationService()
