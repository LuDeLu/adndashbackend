const asyncHandler = require("express-async-handler")
const eventService = require("../services/eventService")
const notificationTriggers = require("../triggers/notificationTriggers")
const googleCalendarService = require("../services/googleCalendarService")

// Método para iniciar el flujo de autenticación con Google
const initiateGoogleAuth = asyncHandler(async (req, res) => {
  try {
    const authUrl = await googleCalendarService.getAuthUrl(req.user.userId)
    res.json({ authUrl })
  } catch (error) {
    console.error("Error initiating Google auth:", error)
    res.status(500).json({ message: "Failed to initiate Google authentication", error: error.message })
  }
})

// Método para manejar el callback de Google OAuth
const handleGoogleCallback = asyncHandler(async (req, res) => {
  try {
    const { code } = req.query
    const userId = req.user.userId

    if (!code) {
      return res.status(400).json({ message: "Authorization code is required" })
    }

    await googleCalendarService.exchangeCodeForTokens(userId, code)

    // Redirigir a la página de calendario con un mensaje de éxito
    res.redirect("/calendario?status=connected")
  } catch (error) {
    console.error("Error handling Google callback:", error)
    res.status(500).json({ message: "Failed to complete Google authentication", error: error.message })
  }
})

// Método para verificar el estado de conexión con Google Calendar
const checkGoogleConnection = asyncHandler(async (req, res) => {
  try {
    const isConnected = await googleCalendarService.isUserConnected(req.user.userId)
    res.json({ connected: isConnected })
  } catch (error) {
    console.error("Error checking Google connection:", error)
    res.status(500).json({ message: "Failed to check Google connection", error: error.message })
  }
})

const syncWithGoogleCalendar = asyncHandler(async (req, res) => {
  try {
    const syncResult = await eventService.syncWithGoogleCalendar(req.user.userId)
    res.json({
      message: "Events synced with Google Calendar successfully",
      stats: syncResult,
    })
  } catch (error) {
    console.error("Error syncing with Google Calendar:", error)

    // Manejo específico de errores comunes
    if (error.message.includes("invalid_grant") || error.message.includes("token expired")) {
      return res.status(401).json({
        message: "Google Calendar authorization expired",
        error: error.message,
        action: "reauthorize",
      })
    }

    res.status(500).json({ message: "Failed to sync with Google Calendar", error: error.message })
  }
})

const getAllEvents = asyncHandler(async (req, res) => {
  try {
    const events = await eventService.getAllEvents(req.user.userId)
    res.json(events)
  } catch (error) {
    console.error("Error fetching events:", error)
    res.status(500).json({ message: "Failed to fetch events", error: error.message })
  }
})

const createEvent = asyncHandler(async (req, res) => {
  try {
    console.log("Creando nuevo evento:", req.body.title, "para usuario:", req.user.userId)
    const nuevoEvento = await eventService.createEvent(req.user.userId, req.body)

    // Generar notificación
    console.log("Generando notificación para nuevo evento")
    await notificationTriggers.onEventCreated(nuevoEvento)
    console.log("Notificación generada exitosamente")

    res.status(201).json(nuevoEvento)
  } catch (error) {
    console.error("Error al crear evento:", error)

    // Manejo específico de errores de Google Calendar
    if (error.message.includes("Google Calendar")) {
      return res.status(207).json({
        message: "Event created locally but failed to sync with Google Calendar",
        event: error.localEvent,
        googleError: error.message,
      })
    }

    res.status(500).json({ message: "Error al crear evento", error: error.message })
  }
})

const updateEvent = asyncHandler(async (req, res) => {
  try {
    const updatedEvent = await eventService.updateEvent(req.user.userId, req.params.id, req.body)
    res.json({
      message: "Event updated successfully",
      event: updatedEvent,
    })
  } catch (error) {
    console.error("Error updating event:", error)

    // Manejo específico de errores de Google Calendar
    if (error.message.includes("Google Calendar")) {
      return res.status(207).json({
        message: "Event updated locally but failed to sync with Google Calendar",
        googleError: error.message,
      })
    }

    res.status(500).json({ message: "Failed to update event", error: error.message })
  }
})

const deleteEvent = asyncHandler(async (req, res) => {
  try {
    await eventService.deleteEvent(req.user.userId, req.params.id)
    res.json({ message: "Event deleted successfully" })
  } catch (error) {
    console.error("Error deleting event:", error)

    // Manejo específico de errores de Google Calendar
    if (error.message.includes("Google Calendar")) {
      return res.status(207).json({
        message: "Event deleted locally but failed to delete from Google Calendar",
        googleError: error.message,
      })
    }

    res.status(500).json({ message: "Failed to delete event", error: error.message })
  }
})

module.exports = {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  syncWithGoogleCalendar,
  initiateGoogleAuth,
  handleGoogleCallback,
  checkGoogleConnection,
}
