const express = require("express")
const router = express.Router()
const { authenticateToken } = require("../middleware/auth")
const eventController = require("../controllers/eventController")

router.get("/", authenticateToken, eventController.getAllEvents)
router.post("/", authenticateToken, eventController.createEvent)
router.put("/:id", authenticateToken, eventController.updateEvent)
router.delete("/:id", authenticateToken, eventController.deleteEvent)

router.post("/sync", authenticateToken, eventController.syncWithGoogleCalendar)
router.get("/google/auth", authenticateToken, eventController.initiateGoogleAuth)
router.get("/google/callback", eventController.handleGoogleCallback)
router.get("/google/status", authenticateToken, eventController.checkGoogleConnection)

module.exports = router
