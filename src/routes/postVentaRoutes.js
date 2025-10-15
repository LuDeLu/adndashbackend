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

// Rutas para detalles
router.post("/:id/detalles", authenticateToken, postVentaController.agregarDetalleReclamo)
router.delete("/:id/detalles/:index", authenticateToken, postVentaController.eliminarDetalleReclamo)

// Rutas adicionales
router.get("/search/term", authenticateToken, postVentaController.searchReclamos)
router.get("/stats/overview", authenticateToken, postVentaController.getEstadisticas)
router.post("/enviar-correo", authenticateToken, postVentaController.enviarCorreo)

// Ruta para actualizar fecha y hora de visita
router.put("/:id/fecha-hora-visita", authenticateToken, postVentaController.actualizarFechaHoraVisita)

router.post("/:id/cerrar", authenticateToken, postVentaController.cerrarTicket)

module.exports = router
