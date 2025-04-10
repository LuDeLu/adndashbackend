const express = require("express")
const router = express.Router()
const { authenticateToken } = require("../middleware/auth")
const floorController = require("../controllers/floorController")

// Get all floors for a project
router.get("/project/:projectId", authenticateToken, floorController.getFloorsByProjectId)

// Get specific floor by project and floor number
router.get("/project/:projectId/number/:floorNumber", authenticateToken, floorController.getFloorByProjectAndNumber)

// Get floor data (including apartments and SVG paths)
router.get("/project/:projectId/data/:floorNumber", authenticateToken, floorController.getFloorData)

// Get activity logs for a project
router.get("/project/:projectId/logs", authenticateToken, floorController.getActivityLogs)

module.exports = router
