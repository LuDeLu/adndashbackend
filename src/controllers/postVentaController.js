const postVentaService = require("../services/postVentaService")
const asyncHandler = require("../utils/asyncHandler")
const nodemailer = require("nodemailer")

const postVentaController = {
  createReclamo: asyncHandler(async (req, res) => {
    const nuevoReclamo = await postVentaService.createReclamo(req.body)
    res.status(201).json(nuevoReclamo)
  }),

  getAllReclamos: asyncHandler(async (req, res) => {
    const reclamos = await postVentaService.getAllReclamos()
    res.json(reclamos)
  }),

  getReclamoById: asyncHandler(async (req, res) => {
    const reclamo = await postVentaService.getReclamoById(req.params.id)
    if (reclamo) {
      res.json(reclamo)
    } else {
      res.status(404).json({ message: "Reclamo no encontrado" })
    }
  }),

  updateReclamo: asyncHandler(async (req, res) => {
    const updatedReclamo = await postVentaService.updateReclamo(req.params.id, req.body)
    if (updatedReclamo) {
      res.json(updatedReclamo)
    } else {
      res.status(404).json({ message: "Reclamo no encontrado" })
    }
  }),

  deleteReclamo: asyncHandler(async (req, res) => {
    const deleted = await postVentaService.deleteReclamo(req.params.id)
    if (deleted) {
      res.json({ message: "Reclamo eliminado con éxito" })
    } else {
      res.status(404).json({ message: "Reclamo no encontrado" })
    }
  }),

  searchReclamos: asyncHandler(async (req, res) => {
    const { term } = req.query
    if (!term) {
      return res.status(400).json({ message: "Se requiere un término de búsqueda" })
    }

    const reclamos = await postVentaService.searchReclamos(term)
    res.json(reclamos)
  }),

  getReclamosStats: asyncHandler(async (req, res) => {
    const stats = await postVentaService.getReclamosStats()
    res.json(stats)
  }),

  enviarCorreo: asyncHandler(async (req, res) => {
    const { reclamo, tipo, asunto, mensaje } = req.body

    if (!reclamo || !tipo) {
      return res.status(400).json({ message: "Faltan datos requeridos" })
    }

    // Configuración del transporte de correo (esto debería estar en un archivo de configuración)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.example.com",
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER || "user@example.com",
        pass: process.env.EMAIL_PASS || "password",
      },
    })

    // Preparar el contenido del correo según el tipo
    let emailSubject = asunto || ""
    let emailContent = mensaje || ""

    if (!emailSubject || !emailContent) {
      if (tipo === "nuevo_reclamo") {
        emailSubject = `Confirmación de Reclamo - Ticket ${reclamo.ticket}`
        emailContent = `
          <h2>Confirmación de Reclamo</h2>
          <p>Estimado/a ${reclamo.cliente},</p>
          <p>Hemos recibido su reclamo con el ticket número <strong>${reclamo.ticket}</strong>.</p>
          <p><strong>Detalle del reclamo:</strong> ${reclamo.detalle}</p>
          <p><strong>Edificio:</strong> ${reclamo.edificio} - UF ${reclamo.unidadFuncional}</p>
          ${reclamo.fechaVisita ? `<p><strong>Fecha programada para visita:</strong> ${reclamo.fechaVisita}</p>` : ""}
          <p>Nos pondremos en contacto con usted a la brevedad para coordinar la inspección.</p>
          <p>Saludos cordiales,</p>
          <p>Equipo de Post Venta<br>ADN Developers</p>
        `
      } else if (tipo === "actualizacion_estado") {
        emailSubject = `Actualización de Reclamo - Ticket ${reclamo.ticket}`
        emailContent = `
          <h2>Actualización de Estado de Reclamo</h2>
          <p>Estimado/a ${reclamo.cliente},</p>
          <p>Le informamos que su reclamo con ticket número <strong>${reclamo.ticket}</strong> ha sido actualizado.</p>
          <p><strong>Estado actual:</strong> ${reclamo.estado}</p>
          <p><strong>Detalle del reclamo:</strong> ${reclamo.detalle}</p>
          <p><strong>Edificio:</strong> ${reclamo.edificio} - UF ${reclamo.unidadFuncional}</p>
          ${reclamo.fechaVisita ? `<p><strong>Fecha programada para visita:</strong> ${reclamo.fechaVisita}</p>` : ""}
          <p>Si tiene alguna consulta, no dude en contactarnos.</p>
          <p>Saludos cordiales,</p>
          <p>Equipo de Post Venta<br>ADN Developers</p>
        `
      }
    }

    // Opciones del correo
    const mailOptions = {
      from: process.env.EMAIL_FROM || "postventa@adndevelopers.com.ar",
      to: reclamo.email || "cliente@example.com", // Idealmente, el reclamo debería tener el email del cliente
      subject: emailSubject,
      html: emailContent,
    }

    try {
      // Enviar el correo (comentado para evitar envíos reales en desarrollo)
      // await transporter.sendMail(mailOptions);

      // En un entorno de producción, descomentar la línea anterior y comentar la siguiente
      console.log("Correo simulado enviado a:", mailOptions.to)

      res.json({ message: "Correo enviado con éxito" })
    } catch (error) {
      console.error("Error al enviar correo:", error)
      res.status(500).json({ message: "Error al enviar el correo", error: error.message })
    }
  }),

  actualizarFechaHoraVisita: asyncHandler(async (req, res) => {
    const { id } = req.params
    const { fechaVisita, horaVisita } = req.body

    if (!fechaVisita || !horaVisita) {
      return res.status(400).json({ message: "Se requiere fecha y hora de visita" })
    }

    const updatedReclamo = await postVentaService.actualizarFechaHoraVisita(id, fechaVisita, horaVisita)
    if (updatedReclamo) {
      res.json(updatedReclamo)
    } else {
      res.status(404).json({ message: "Reclamo no encontrado" })
    }
  }),
}

module.exports = postVentaController

