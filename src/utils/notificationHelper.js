/**
 * Utilidad para generar notificaciones desde cualquier parte del sistema
 */
const notificationService = require("../services/notificationService")

const notificationHelper = {
  /**
   * Crea una notificación para un usuario específico
   * @param {number} userId - ID del usuario
   * @param {string} message - Mensaje de la notificación
   * @param {string} type - Tipo de notificación: 'info', 'warning', 'success', 'error'
   * @param {string} module - Módulo relacionado: 'clientes', 'proyectos', 'calendario', 'obras', 'postventa', 'sistema'
   * @param {string|null} link - Enlace opcional para navegar al hacer clic
   */
  async notifyUser(userId, message, type = "info", module = "sistema", link = null) {
    return await notificationService.createNotification(userId, message, type, module, link)
  },

  /**
   * Crea una notificación para todos los usuarios con un rol específico
   * @param {number} roleId - ID del rol
   * @param {string} message - Mensaje de la notificación
   * @param {string} type - Tipo de notificación: 'info', 'warning', 'success', 'error'
   * @param {string} module - Módulo relacionado: 'clientes', 'proyectos', 'calendario', 'obras', 'postventa', 'sistema'
   * @param {string|null} link - Enlace opcional para navegar al hacer clic
   */
  async notifyRole(roleId, message, type = "info", module = "sistema", link = null) {
    return await notificationService.createNotificationForRole(roleId, message, type, module, link)
  },

  /**
   * Crea una notificación para todos los usuarios
   * @param {string} message - Mensaje de la notificación
   * @param {string} type - Tipo de notificación: 'info', 'warning', 'success', 'error'
   * @param {string} module - Módulo relacionado: 'clientes', 'proyectos', 'calendario', 'obras', 'postventa', 'sistema'
   * @param {string|null} link - Enlace opcional para navegar al hacer clic
   */
  async notifyAll(message, type = "info", module = "sistema", link = null) {
    const pool = require("../config/database").getPool()
    const [users] = await pool.query("SELECT id FROM users")

    for (const user of users) {
      await notificationService.createNotification(user.id, message, type, module, link)
    }
  },
}

module.exports = notificationHelper

