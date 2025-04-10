const express = require("express")
const router = express.Router()
const { authenticateToken } = require("../middleware/auth")
const parkingController = require("../controllers/parkingController")

// Get all parking spots for a project
router.get("/project/:projectId", authenticateToken, parkingController.getParkingSpotsByProjectId)

// Update parking spot
router.put("/:spotId", authenticateToken, parkingController.updateParkingSpot)

// Assign multiple parking spots to an apartment
router.post("/project/:projectId/assign", authenticateToken, parkingController.assignMultipleParkingSpots)

module.exports = router
