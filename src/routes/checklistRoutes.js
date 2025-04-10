const express = require("express")
const router = express.Router()
const { authenticateToken } = require("../middleware/auth")
const checklistController = require("../controllers/checklistController")
const { generatePDFHandler } = require("../controllers/pdfController") // Ajusta la ruta según tu estructura

// Rutas básicas CRUD
router.get("/", authenticateToken, checklistController.getAllTickets)
router.get("/:id", authenticateToken, checklistController.getTicketById)
router.post("/", authenticateToken, checklistController.createTicket)
router.put("/:id", authenticateToken, checklistController.updateTicket)
router.delete("/:id", authenticateToken, checklistController.deleteTicket)

// Rutas para aprobaciones
router.post("/:id/approve", authenticateToken, checklistController.approveTicket)
router.get("/stats", authenticateToken, checklistController.getTicketStats)
router.get("/search", authenticateToken, checklistController.searchTickets)

// Ruta para generar PDF
router.post("/generate-pdf", authenticateToken, generatePDFHandler)

module.exports = router