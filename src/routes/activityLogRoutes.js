const express = require("express")
const router = express.Router()
const {
  getActivityLogsByProjectId,
  createActivityLog,
  getAllActivityLogs,
} = require("../controllers/activityLogController")

// Obtener logs de actividad por proyecto
router.get("/project/:projectId", getActivityLogsByProjectId)

// Crear un nuevo log de actividad
router.post("/", createActivityLog)

// Obtener todos los logs de actividad (con filtros opcionales)
router.get("/", getAllActivityLogs)

module.exports = router
