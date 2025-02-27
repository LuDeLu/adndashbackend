const express = require("express")
const router = express.Router()
const postVentaController = require("../controllers/postVentaController")
const { authenticateToken } = require("../middleware/auth")

// Rutas básicas CRUD
router.post("/", authenticateToken, postVentaController.createReclamo)
router.get("/", authenticateToken, postVentaController.getAllReclamos)
router.get("/:id", authenticateToken, postVentaController.getReclamoById)
router.put("/:id", authenticateToken, postVentaController.updateReclamo)
router.delete("/:id", authenticateToken, postVentaController.deleteReclamo)

// Rutas adicionales
router.get("/search/term", authenticateToken, postVentaController.searchReclamos)
router.get("/stats/overview", authenticateToken, postVentaController.getReclamosStats)
router.post("/enviar-correo", authenticateToken, postVentaController.enviarCorreo)

// Añadir esta nueva ruta
router.put("/:id/fecha-hora-visita", authenticateToken, postVentaController.actualizarFechaHoraVisita)

// Las demás rutas permanecen sin cambios

module.exports = router

