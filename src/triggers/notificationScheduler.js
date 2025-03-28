/**
 * Este archivo contiene la lógica para programar y ejecutar notificaciones automáticas
 * basadas en eventos programados o condiciones específicas
 */
const cron = require("node-cron")
const { getPool } = require("../config/database")
const notificationTriggers = require("./notificationTriggers")
const notificationHelper = require("../utils/notificationHelper")

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

class NotificationScheduler {
  constructor() {
    this.jobs = []
  }

  // Iniciar todos los trabajos programados
  start() {
    console.log("Iniciando programador de notificaciones...")

    // Verificar eventos del calendario (cada hora)
    this.jobs.push(
      cron.schedule("0 * * * *", () => {
        this.checkUpcomingEvents()
      }),
    )

    // Verificar reclamos sin atender (cada día a las 9:00 AM)
    this.jobs.push(
      cron.schedule("0 9 * * *", () => {
        this.checkPendingReclamos()
      }),
    )

    // Verificar tareas de construcción retrasadas (cada día a las 8:00 AM)
    this.jobs.push(
      cron.schedule("0 8 * * *", () => {
        this.checkDelayedConstructionTasks()
      }),
    )

    // Generar resumen semanal (cada lunes a las 8:00 AM)
    this.jobs.push(
      cron.schedule("0 8 * * 1", () => {
        this.generateWeeklySummary()
      }),
    )

    console.log("Programador de notificaciones iniciado")
  }

  // Detener todos los trabajos programados
  stop() {
    console.log("Deteniendo programador de notificaciones...")
    this.jobs.forEach((job) => job.stop())
    this.jobs = []
    console.log("Programador de notificaciones detenido")
  }

  // Verificar eventos próximos en el calendario
  async checkUpcomingEvents() {
    console.log("Verificando eventos próximos...")
    const pool = getPool()

    try {
      // Buscar eventos que ocurrirán en las próximas 24 horas y no se ha enviado recordatorio
      const [events] = await pool.query(`
        SELECT * FROM events 
        WHERE start BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
        AND reminded = 0
      `)

      console.log(`Encontrados ${events.length} eventos próximos`)

      for (const event of events) {
        // Enviar notificación al usuario
        await notificationHelper.notifyUser(
          event.user_id,
          `Recordatorio: Tienes un evento "${event.title}" con ${event.client} mañana`,
          "info",
          "calendario",
          "/calendario",
        )

        // Marcar como recordado
        await pool.query("UPDATE events SET reminded = 1 WHERE id = ?", [event.id])
      }
    } catch (error) {
      console.error("Error al verificar eventos próximos:", error)
    }
  }

  // Verificar reclamos pendientes sin atender
  async checkPendingReclamos() {
    console.log("Verificando reclamos pendientes...")
    const pool = getPool()

    try {
      // Buscar reclamos en estado "Ingresado" con más de 3 días
      const [reclamos] = await pool.query(`
        SELECT * FROM reclamos 
        WHERE estado = 'Ingresado' 
        AND fechaIngreso < DATE_SUB(CURDATE(), INTERVAL 3 DAY)
      `)

      console.log(`Encontrados ${reclamos.length} reclamos pendientes sin atender`)

      if (reclamos.length > 0) {
        // Enviar notificación a todos los usuarios de postventa
        await notificationHelper.notifyRole(
          ROLES.POSTVENTA,
          `Hay ${reclamos.length} reclamos pendientes sin atender por más de 3 días`,
          "warning",
          "postventa",
          "/postventas",
        )
      }
    } catch (error) {
      console.error("Error al verificar reclamos pendientes:", error)
    }
  }

  // Verificar tareas de construcción retrasadas
  async checkDelayedConstructionTasks() {
    console.log("Verificando tareas de construcción retrasadas...")
    const pool = getPool()

    try {
      // Buscar tareas con fecha de finalización pasada y progreso < 100%
      const [tasks] = await pool.query(`
        SELECT t.*, p.name as project_name 
        FROM construction_tasks t
        JOIN construction_projects p ON t.project_id = p.id
        WHERE t.end_date < CURDATE() 
        AND t.progress < 100
      `)

      console.log(`Encontradas ${tasks.length} tareas retrasadas`)

      for (const task of tasks) {
        // Enviar notificación a todos los usuarios de obras
        await notificationTriggers.onConstructionTaskDelayed(
          { name: task.name, id: task.id },
          { name: task.project_name, id: task.project_id },
        )
      }
    } catch (error) {
      console.error("Error al verificar tareas retrasadas:", error)
    }
  }

  // Generar resumen semanal
  async generateWeeklySummary() {
    console.log("Generando resumen semanal...")
    const pool = getPool()

    try {
      // Obtener estadísticas de la semana anterior
      const [clientesNuevos] = await pool.query(`
        SELECT COUNT(*) as count FROM clientes 
        WHERE fecha_creacion > DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      `)

      const [reclamosNuevos] = await pool.query(`
        SELECT COUNT(*) as count FROM reclamos 
        WHERE fechaIngreso > DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      `)

      const [reclamosSolucionados] = await pool.query(`
        SELECT COUNT(*) as count FROM reclamos 
        WHERE estado = 'Solucionado' 
        AND fechaIngreso > DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      `)

      // Crear mensaje de resumen
      const mensaje = `Resumen semanal: ${clientesNuevos[0].count} nuevos clientes, ${reclamosNuevos[0].count} nuevos reclamos, ${reclamosSolucionados[0].count} reclamos solucionados`

      // Enviar notificación a administradores
      await notificationHelper.notifyRole(ROLES.ADMIN, mensaje, "info", "sistema", "/dashboard")

      console.log("Resumen semanal enviado")
    } catch (error) {
      console.error("Error al generar resumen semanal:", error)
    }
  }
}

module.exports = new NotificationScheduler()

