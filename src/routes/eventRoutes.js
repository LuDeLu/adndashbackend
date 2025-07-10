const express = require("express")
const router = express.Router()
const { authenticateToken } = require("../middleware/auth")
const eventController = require("../controllers/eventController")

// Rutas básicas de CRUD
router.get("/", authenticateToken, eventController.getAllEvents)
router.post("/", authenticateToken, eventController.createEvent)
router.put("/:id", authenticateToken, eventController.updateEvent)
router.delete("/:id", authenticateToken, eventController.deleteEvent)

// Rutas para sincronización con Google Calendar
router.post("/sync", authenticateToken, eventController.syncWithGoogleCalendar)
router.get("/google/auth", authenticateToken, eventController.initiateGoogleAuth)
router.get("/google/callback", authenticateToken, eventController.handleGoogleCallback)
router.get("/google/status", authenticateToken, eventController.checkGoogleConnection)

module.exports = router
