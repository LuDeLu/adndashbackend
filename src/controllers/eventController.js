const asyncHandler = require("express-async-handler")
const eventService = require("../services/eventService")
const notificationTriggers = require("../triggers/notificationTriggers")

const syncWithGoogleCalendar = asyncHandler(async (req, res) => {
  try {
    await eventService.syncWithGoogleCalendar(req.user.userId)
    res.json({ message: "Events synced with Google Calendar successfully" })
  } catch (error) {
    console.error("Error syncing with Google Calendar:", error)
    res.status(500).json({ message: "Failed to sync with Google Calendar", error: error.message })
  }
})

const getAllEvents = asyncHandler(async (req, res) => {
  const events = await eventService.getAllEvents(req.user.userId)
  res.json(events)
})

const createEvent = asyncHandler(async (req, res) => {
  const nuevoEvento = await eventService.createEvent(req.user.userId, req.body)

  // Añadir notificación
  await notificationTriggers.onEventCreated(nuevoEvento)

  res.status(201).json(nuevoEvento)
})

const updateEvent = asyncHandler(async (req, res) => {
  await eventService.updateEvent(req.user.userId, req.params.id, req.body)
  res.json({ message: "Event updated successfully" })
})

const deleteEvent = asyncHandler(async (req, res) => {
  await eventService.deleteEvent(req.user.userId, req.params.id)
  res.json({ message: "Event deleted successfully" })
})

module.exports = {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  syncWithGoogleCalendar,
}

