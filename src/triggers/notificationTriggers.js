/**
 * Este archivo contiene funciones para generar notificaciones automáticas
 * basadas en eventos del sistema
 */
const notificationService = require("../services/notificationService")

// Roles
const ROLES = {
  SUPERADMIN: 1,
  ADMIN: 2,
  USER: 3,
  COMERCIAL: 4,
  MARKETING: 5,
  OBRAS: 6,
  POSTVENTA: 7,
  ARQUITECTURA: 8,
  FINANZAS: 9,
  RRHH: 10,
}

const notificationTriggers = {
  // Notificaciones para clientes
  async onClienteCreated(cliente) {
    await notificationService.createNotificationForRole(
      ROLES.COMERCIAL,
      `Nuevo cliente registrado: ${cliente.nombre} ${cliente.apellido}`,
      "info",
      "clientes",
      "/clientes",
    )
  },

  // Notificaciones para proyectos
  async onProjectUpdated(project) {
    await notificationService.createNotificationForRole(
      ROLES.ADMIN,
      `Proyecto actualizado: ${project.name}`,
      "info",
      "proyectos",
      "/proyectos",
    )
  },

  // Notificaciones para reclamos de postventa
  async onReclamoCreated(reclamo) {
    await notificationService.createNotificationForRole(
      ROLES.POSTVENTA,
      `Nuevo reclamo: ${reclamo.ticket} - ${reclamo.cliente}`,
      "warning",
      "postventa",
      "/postventas",
    )
  },

  async onReclamoStatusChanged(reclamo, oldStatus, newStatus) {
    await notificationService.createNotificationForRole(
      ROLES.POSTVENTA,
      `Reclamo ${reclamo.ticket} cambió de estado: ${oldStatus} → ${newStatus}`,
      "info",
      "postventa",
      "/postventas",
    )
  },

  // Notificaciones para eventos del calendario
  async onEventCreated(event) {
    await notificationService.createNotification(
      event.user_id,
      `Nuevo evento: ${event.title} con ${event.client}`,
      "info",
      "calendario",
      "/calendario",
    )
  },

  // Notificaciones para obras
  async onConstructionTaskDelayed(task, project) {
    await notificationService.createNotificationForRole(
      ROLES.OBRAS,
      `Tarea retrasada: ${task.name} en ${project.name}`,
      "error",
      "obras",
      "/obras",
    )
  },

  // Notificación general para todos los usuarios
  async notifyAllUsers(message, type = "info", module = "sistema", link = null) {
    const pool = require("../config/database").getPool()
    const [users] = await pool.query("SELECT id FROM users")

    for (const user of users) {
      await notificationService.createNotification(user.id, message, type, module, link)
    }
  },
}

module.exports = notificationTriggers

