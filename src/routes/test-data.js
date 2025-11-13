const express = require("express")
const router = express.Router()
const { authenticateToken } = require("../middleware/auth")
const notificationService = require("../services/notificationService")

router.post("/seed", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId

    if (!userId) {
      return res.status(400).json({ error: "User ID not found in token" })
    }

    const { count = 20, type } = req.body

    const modules = ["clientes", "proyectos", "calendario", "obras", "postventa", "sistema"]
    const types = type ? [type] : ["info", "warning", "success", "error"]
    const priorities = ["low", "medium", "high", "critical"]

    const messages = {
      info: [
        "Se ha actualizado la configuración del sistema",
        "Nueva versión disponible",
        "Reunión de equipo en 30 minutos",
        "Recordatorio de backup diario",
        "Se han sincronizado todos los datos",
        "Configuración de notificaciones actualizada",
      ],
      warning: [
        "Progreso en retraso",
        "Atención requerida en el proyecto",
        "Revisar documentación pendiente",
        "Fecha de entrega próxima",
        "Espacio en disco bajo",
        "Revisar cambios pendientes",
      ],
      success: [
        "Proyecto completado exitosamente",
        "Cliente aprobó diseño",
        "Documentos descargados correctamente",
        "Sincronización completada",
        "Operación realizada con éxito",
        "Cambios guardados correctamente",
      ],
      error: [
        "Error al conectar con base de datos",
        "Falló la carga de archivos",
        "Permiso denegado",
        "Error desconocido del sistema",
        "La operación no se pudo completar",
        "Error de validación",
      ],
    }

    const createdNotifications = []

    for (let i = 0; i < count; i++) {
      const selectedType = types[Math.floor(Math.random() * types.length)]
      const module = modules[Math.floor(Math.random() * modules.length)]
      const priority = priorities[Math.floor(Math.random() * priorities.length)]
      const messageList = messages[selectedType]
      const message = messageList[Math.floor(Math.random() * messageList.length)]

      try {
        const notifId = await notificationService.createNotificationAdvanced({
          userId,
          message: `[PRUEBA #${i + 1}] ${message}`,
          type: selectedType,
          module,
          priority,
          sentTo: "user",
        })

        createdNotifications.push({
          id: notifId,
          type: selectedType,
          module,
          priority,
          message: `[PRUEBA #${i + 1}] ${message}`,
        })
      } catch (error) {
        console.error(`[v0] Error creating notification ${i + 1}:`, error.message)
      }
    }

    res.status(201).json({
      message: `${createdNotifications.length} test notifications created successfully`,
      created: createdNotifications,
      userId: userId,
    })
  } catch (error) {
    console.error("[v0] Error seeding test notifications:", error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
