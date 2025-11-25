const express = require("express")
const router = express.Router()
const projectDataController = require("../controllers/projectDataController")
const { authenticateToken } = require("../middleware/auth")

// Get list of all projects
router.get("/", authenticateToken, projectDataController.getAllProjects)

// Get all data for a specific project
router.get("/:projectName", authenticateToken, projectDataController.getProjectData)

// Update all data for a project
router.put("/:projectName", authenticateToken, projectDataController.updateProjectData)

// Add or update owner for a unit
router.post("/:projectName/owner", authenticateToken, projectDataController.addOwner)

// Remove owner from a unit
router.delete("/:projectName/owner/:unitId", authenticateToken, projectDataController.removeOwner)

// Update status for a unit
router.post("/:projectName/status", authenticateToken, projectDataController.updateStatus)

module.exports = router
