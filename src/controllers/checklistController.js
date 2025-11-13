const checklistService = require("../services/checklistService")
const asyncHandler = require("../utils/asyncHandler")
const notificationTriggers = require("../triggers/notificationTriggers")
const { generatePDF: generatePDFDocument } = require("../lib/pdf-generator")

const getAllTickets = asyncHandler(async (req, res) => {
  try {
    console.log("Iniciando obtención de tickets de aprobación")
    const tickets = await checklistService.getAllTickets()
    console.log(`Se encontraron ${tickets.length} tickets`)
    res.json(tickets)
  } catch (error) {
    console.error("Error en getAllTickets controller:", error)
    res.status(500).json({ message: "Error al obtener los tickets", error: error.message })
  }
})

const getTicketById = asyncHandler(async (req, res) => {
  try {
    const ticket = await checklistService.getTicketById(req.params.id)
    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" })
    }
    res.json(ticket)
  } catch (error) {
    console.error("Error en getTicketById controller:", error)
    res.status(500).json({ message: "Error al obtener el ticket", error: error.message })
  }
})

const createTicket = asyncHandler(async (req, res) => {
  try {
    console.log("Creando nuevo ticket de aprobación:", req.body.title)

    // Asegurarse de que formData esté presente
    if (!req.body.formData) {
      return res.status(400).json({ message: "Datos del formulario requeridos" })
    }

    const nuevoTicket = await checklistService.createTicket(req.body, req.user.userId)

    // Generar notificación
    console.log("Generando notificación para nuevo ticket")
    await notificationTriggers.onTicketCreated(nuevoTicket)
    console.log("Notificación generada exitosamente")

    res.status(201).json(nuevoTicket)
  } catch (error) {
    console.error("Error al crear ticket:", error)
    res.status(500).json({ message: "Error al crear ticket", error: error.message })
  }
})

const updateTicket = asyncHandler(async (req, res) => {
  try {
    const ticketActualizado = await checklistService.updateTicket(req.params.id, req.body)
    if (!ticketActualizado) {
      return res.status(404).json({ message: "Ticket no encontrado" })
    }
    res.json(ticketActualizado)
  } catch (error) {
    console.error("Error en updateTicket controller:", error)
    res.status(500).json({ message: "Error al actualizar el ticket", error: error.message })
  }
})

const deleteTicket = asyncHandler(async (req, res) => {
  try {
    const resultado = await checklistService.deleteTicket(req.params.id)
    if (!resultado) {
      return res.status(404).json({ message: "Ticket no encontrado" })
    }
    res.json({ message: "Ticket eliminado exitosamente" })
  } catch (error) {
    console.error("Error en deleteTicket controller:", error)
    res.status(500).json({ message: "Error al eliminar el ticket", error: error.message })
  }
})

const approveTicket = asyncHandler(async (req, res) => {
  try {
    const { department, approved, comentarios } = req.body
    if (!department || approved === undefined) {
      return res.status(400).json({ message: "Faltan datos requeridos" })
    }

    const ticketActualizado = await checklistService.approveTicket(
      req.params.id,
      department,
      approved,
      req.user.userId,
      req.user.nombre || "Usuario",
      comentarios,
    )

    if (!ticketActualizado) {
      return res.status(404).json({ message: "Ticket no encontrado" })
    }

    // Generar notificación de aprobación
    await notificationTriggers.onTicketApproved(ticketActualizado, department, approved, req.user.userId)

    res.json(ticketActualizado)
  } catch (error) {
    console.error("Error en approveTicket controller:", error)
    res.status(500).json({ message: "Error al aprobar el ticket", error: error.message })
  }
})

const getTicketStats = asyncHandler(async (req, res) => {
  try {
    const stats = await checklistService.getTicketStats()
    res.json(stats)
  } catch (error) {
    console.error("Error en getTicketStats controller:", error)
    res.status(500).json({ message: "Error al obtener estadísticas", error: error.message })
  }
})

const searchTickets = asyncHandler(async (req, res) => {
  try {
    const { term } = req.query
    if (!term) {
      return res.status(400).json({ message: "Se requiere un término de búsqueda" })
    }
    const tickets = await checklistService.searchTickets(term)
    res.json(tickets)
  } catch (error) {
    console.error("Error en searchTickets controller:", error)
    res.status(500).json({ message: "Error al buscar tickets", error: error.message })
  }
})

// Nuevo método para generar PDF
const generatePDF = asyncHandler(async (req, res) => {
  try {
    const { formData } = req.body

    if (!formData) {
      return res.status(400).json({ message: "Datos del formulario requeridos" })
    }

    console.log("Generando PDF para formulario")
    const pdfBuffer = await generatePDFDocument(formData)

    // Configurar encabezados para descargar el PDF
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "attachment; filename=formulario.pdf")

    // Enviar el PDF como respuesta
    res.send(pdfBuffer)
  } catch (error) {
    console.error("Error al generar PDF:", error)
    res.status(500).json({ message: "Error al generar PDF", error: error.message })
  }
})

// Nuevo método para descargar PDF de un ticket específico
const downloadTicketPDF = asyncHandler(async (req, res) => {
  try {
    const ticket = await checklistService.getTicketById(req.params.id)

    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" })
    }

    console.log("Descargando PDF para ticket:", ticket.ticket_id)
    const pdfBuffer = await generatePDFDocument(ticket.formData)

    // Configurar encabezados para descargar el PDF
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename=${ticket.ticket_id}.pdf`)

    // Enviar el PDF como respuesta
    res.send(pdfBuffer)
  } catch (error) {
    console.error("Error al descargar PDF del ticket:", error)
    res.status(500).json({ message: "Error al descargar PDF", error: error.message })
  }
})

module.exports = {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  approveTicket,
  getTicketStats,
  searchTickets,
  generatePDF,
  downloadTicketPDF,
}
