const asyncHandler = require("express-async-handler")
const eventService = require("../services/eventService")
const notificationTriggers = require("../triggers/notificationTriggers")
const googleCalendarService = require("../services/googleCalendarService")

const initiateGoogleAuth = asyncHandler(async (req, res) => {
  try {
    const authUrl = await googleCalendarService.getAuthUrl(req.user.userId)
    res.json({ authUrl })
  } catch (error) {
    console.error("Error initiating Google auth:", error)
    res.status(500).json({
      message: "Failed to initiate Google authentication",
      error: error.message,
    })
  }
})

const handleGoogleCallback = asyncHandler(async (req, res) => {
  try {
    const { code, state } = req.query

    if (!code || !state) {
      return res.status(400).send("Missing authorization code or user identification")
    }

    const userId = Number.parseInt(state)
    await googleCalendarService.exchangeCodeForTokens(userId, code)

    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/calendario?status=connected`)
  } catch (error) {
    console.error("Error handling Google callback:", error)
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/calendario?status=error`)
  }
})

const checkGoogleConnection = asyncHandler(async (req, res) => {
  try {
    const isConnected = await googleCalendarService.isUserConnected(req.user.userId)
    res.json({ connected: isConnected })
  } catch (error) {
    console.error("Error checking Google connection:", error)
    res.status(500).json({
      message: "Failed to check Google connection",
      error: error.message,
    })
  }
})

const syncWithGoogleCalendar = asyncHandler(async (req, res) => {
  try {
    const syncResult = await eventService.syncWithGoogleCalendar(req.user.userId)
    res.json({
      message: "Events synced successfully",
      stats: syncResult,
    })
  } catch (error) {
    console.error("Error syncing with Google Calendar:", error)

    if (error.message.includes("not connected")) {
      return res.status(401).json({
        message: "Google Calendar not connected",
        error: error.message,
        action: "connect",
      })
    }

    if (error.message.includes("expired")) {
      return res.status(401).json({
        message: "Google Calendar authorization expired",
        error: error.message,
        action: "reauthorize",
      })
    }

    res.status(500).json({
      message: "Failed to sync with Google Calendar",
      error: error.message,
    })
  }
})

const getAllEvents = asyncHandler(async (req, res) => {
  try {
    const events = await eventService.getAllEvents(req.user.userId)
    res.json(events)
  } catch (error) {
    console.error("Error fetching events:", error)
    res.status(500).json({
      message: "Failed to fetch events",
      error: error.message,
    })
  }
})

const createEvent = asyncHandler(async (req, res) => {
  try {
    const newEvent = await eventService.createEvent(req.user.userId, req.body)

    await notificationTriggers.onEventCreated(newEvent)

    res.status(201).json(newEvent)
  } catch (error) {
    console.error("Error creating event:", error)
    res.status(500).json({
      message: "Failed to create event",
      error: error.message,
    })
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
    res.status(500).json({
      message: "Failed to update event",
      error: error.message,
    })
  }
})

const deleteEvent = asyncHandler(async (req, res) => {
  try {
    await eventService.deleteEvent(req.user.userId, req.params.id)
    res.json({ message: "Event deleted successfully" })
  } catch (error) {
    console.error("Error deleting event:", error)
    res.status(500).json({
      message: "Failed to delete event",
      error: error.message,
    })
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
