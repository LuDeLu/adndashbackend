const express = require("express")
const router = express.Router()
const projectController = require("../controllers/projectController")

// Middleware de autenticación - asegúrate de que este archivo exista
const auth = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de acceso requerido",
      })
    }

    // Aquí deberías validar el token JWT
    // Por ahora, simplemente continuamos
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Token inválido",
    })
  }
}

// Aplicar middleware de autenticación a todas las rutas
router.use(auth)

// Rutas principales de proyectos
router.get("/", projectController.getAllProjects)
router.get("/:id", projectController.getProjectById)
router.post("/", projectController.createProject)

// Rutas de configuración y estadísticas
router.get("/:id/configuration", projectController.getProjectConfiguration)
router.get("/:projectId/statistics", projectController.getProjectStatistics)
router.get("/:projectId/stats", projectController.getProjectStatistics) // Alias para compatibilidad

// Rutas de pisos y apartamentos
router.get("/:projectId/floors", projectController.getProjectFloors)
router.get("/:projectId/floors/:floorNumber/stats", projectController.getFloorStats)
router.get("/:projectId/apartments", projectController.getProjectApartments)

module.exports = router
