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

  async onClienteContactReminder(cliente) {
    await notificationService.createNotificationForRole(
      ROLES.COMERCIAL,
      `Es hora de contactar a ${cliente.nombre} ${cliente.apellido}. Último contacto: ${cliente.ultimo_contacto ? new Date(cliente.ultimo_contacto).toLocaleDateString() : "No registrado"}`,
      "warning",
      "clientes",
      "/clientes",
    )
  },

  async onClienteContactUpdated(cliente) {
    await notificationService.createNotificationForRole(
      ROLES.COMERCIAL,
      `Contacto actualizado para ${cliente.nombre} ${cliente.apellido}. Próximo contacto: ${new Date(cliente.proximo_contacto).toLocaleDateString()}`,
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

  // Notificaciones para tickets de aprobación
  async onTicketCreated(ticket) {
    // Notificar a todos los departamentos involucrados
    const departamentos = [ROLES.FINANZAS, ROLES.ADMIN, ROLES.ARQUITECTURA, ROLES.COMERCIAL]

    for (const rolId of departamentos) {
      await notificationService.createNotificationForRole(
        rolId,
        `Nuevo ticket de aprobación: ${ticket.ticket_id} - ${ticket.title}`,
        "info",
        "documentos",
        "/checklist",
      )
    }
  },

  async onTicketApproved(ticket, department, approved, userId) {
    // Notificar al creador del ticket
    const message = approved
      ? `${
          department === "contaduria"
            ? "Contaduría"
            : department === "legales"
              ? "Legales"
              : department === "tesoreria"
                ? "Tesorería"
                : department === "gerenciaComercial"
                  ? "Gerencia Comercial"
                  : department === "gerencia"
                    ? "Gerencia"
                    : department === "arquitecto"
                      ? "Arquitecto"
                      : department
        } ha aprobado el documento "${ticket.title}" (${ticket.ticket_id})`
      : `${
          department === "contaduria"
            ? "Contaduría"
            : department === "legales"
              ? "Legales"
              : department === "tesoreria"
                ? "Tesorería"
                : department === "gerenciaComercial"
                  ? "Gerencia Comercial"
                  : department === "gerencia"
                    ? "Gerencia"
                    : department === "arquitecto"
                      ? "Arquitecto"
                      : department
        } ha rechazado el documento "${ticket.title}" (${ticket.ticket_id})`

    await notificationService.createNotification(
      ticket.creador_id,
      message,
      approved ? "success" : "warning",
      "documentos",
      "/checklist",
    )

    // Si el ticket está completamente aprobado o rechazado, notificar SOLO UNA VEZ
    if (ticket.estado === "aprobado" || ticket.estado === "rechazado") {
      // Enviar una única notificación al rol ADMIN en lugar de a todos los departamentos
      await notificationService.createNotificationForRole(
        ROLES.ADMIN,
        `El documento "${ticket.title}" (${ticket.ticket_id}) ha sido ${ticket.estado === "aprobado" ? "aprobado por todos los departamentos" : "rechazado"}`,
        ticket.estado === "aprobado" ? "success" : "warning",
        "documentos",
        "/checklist",
      )

      // Opcional: Enviar una notificación al creador si no es admin
      if (ticket.creador_id) {
        await notificationService.createNotification(
          ticket.creador_id,
          `El documento "${ticket.title}" (${ticket.ticket_id}) ha sido ${ticket.estado === "aprobado" ? "aprobado por todos los departamentos" : "rechazado"}`,
          ticket.estado === "aprobado" ? "success" : "warning",
          "documentos",
          "/checklist",
        )
      }
    }
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
