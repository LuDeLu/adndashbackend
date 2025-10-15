const postVentaService = require("../services/postVentaService")
const asyncHandler = require("../utils/asyncHandler")
const nodemailer = require("nodemailer")
const notificationTriggers = require("../triggers/notificationTriggers")

const getAllReclamos = asyncHandler(async (req, res) => {
  const reclamos = await postVentaService.getAllReclamos()
  res.json(reclamos)
})

const createReclamo = asyncHandler(async (req, res) => {
  try {
    console.log("Creando nuevo reclamo:", req.body.ticket, req.body.cliente)
    const nuevoReclamo = await postVentaService.createReclamo(req.body)

    // Generar notificación
    console.log("Generando notificación para nuevo reclamo")
    await notificationTriggers.onReclamoCreated(nuevoReclamo)
    console.log("Notificación generada exitosamente")

    res.status(201).json(nuevoReclamo)
  } catch (error) {
    console.error("Error al crear reclamo:", error)
    res.status(500).json({ message: "Error al crear reclamo", error: error.message })
  }
})

const updateReclamo = asyncHandler(async (req, res) => {
  try {
    // Obtener el reclamo actual para comparar el estado
    const reclamoActual = await postVentaService.getReclamoById(req.params.id)
    const estadoAnterior = reclamoActual.estado
    const estadoNuevo = req.body.estado

    // Actualizar el reclamo
    const reclamoActualizado = await postVentaService.updateReclamo(req.params.id, req.body)

    // Si cambió el estado, generar notificación
    if (estadoAnterior !== estadoNuevo) {
      console.log(`Cambio de estado en reclamo ${reclamoActual.ticket}: ${estadoAnterior} -> ${estadoNuevo}`)
      await notificationTriggers.onReclamoStatusChanged(reclamoActual, estadoAnterior, estadoNuevo)
      console.log("Notificación de cambio de estado generada exitosamente")
    }

    res.json({ message: "Reclamo actualizado exitosamente", reclamo: reclamoActualizado })
  } catch (error) {
    console.error("Error al actualizar reclamo:", error)
    res.status(500).json({ message: "Error al actualizar reclamo", error: error.message })
  }
})

const deleteReclamo = asyncHandler(async (req, res) => {
  await postVentaService.deleteReclamo(req.params.id)
  res.json({ message: "Reclamo eliminado exitosamente" })
})

const getReclamoById = asyncHandler(async (req, res) => {
  const reclamo = await postVentaService.getReclamoById(req.params.id)
  if (!reclamo) {
    res.status(404)
    throw new Error("Reclamo no encontrado")
  }
  res.json(reclamo)
})

const postVentaController = {
  searchReclamos: asyncHandler(async (req, res) => {
    const { term } = req.query
    if (!term) {
      return res.status(400).json({ message: "Se requiere un término de búsqueda" })
    }

    const reclamos = await postVentaService.searchReclamos(term)
    res.json(reclamos)
  }),

  getEstadisticas: asyncHandler(async (req, res) => {
    const stats = await postVentaService.getEstadisticas()
    res.json(stats)
  }),

  enviarCorreo: asyncHandler(async (req, res) => {
    const { reclamo, tipo, asunto, mensaje } = req.body

    if (!reclamo || !tipo) {
      return res.status(400).json({ message: "Faltan datos requeridos" })
    }

    if (!reclamo.detalles) {
      reclamo.detalles = []
    }

    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || "smtp.example.com",
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER || "user@example.com",
        pass: process.env.EMAIL_PASS || "password",
      },
    })

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
        ${
          reclamo.detalles && Array.isArray(reclamo.detalles) && reclamo.detalles.length > 0
            ? `<p><strong>Detalles adicionales:</strong><ul>${reclamo.detalles.map((d) => `<li>${d}</li>`).join("")}</ul></p>`
            : ""
        }
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
        ${
          reclamo.detalles && Array.isArray(reclamo.detalles) && reclamo.detalles.length > 0
            ? `<p><strong>Detalles adicionales:</strong><ul>${reclamo.detalles.map((d) => `<li>${d}</li>`).join("")}</ul></p>`
            : ""
        }
        <p><strong>Edificio:</strong> ${reclamo.edificio} - UF ${reclamo.unidadFuncional}</p>
        ${reclamo.fechaVisita ? `<p><strong>Fecha programada para visita:</strong> ${reclamo.fechaVisita}</p>` : ""}
        <p>Si tiene alguna consulta, no dude en contactarnos.</p>
        <p>Saludos cordiales,</p>
        <p>Equipo de Post Venta<br>ADN Developers</p>
      `
      } else if (tipo === "cierre_ticket") {
        emailSubject = `Cierre de Reclamo - Ticket ${reclamo.ticket}`
        emailContent = `
        <h2>Cierre de Reclamo</h2>
        <p>Estimado/a ${reclamo.cliente},</p>
        <p>Damos por finalizado tu reclamo de la Unidad <strong>${reclamo.unidadFuncional}</strong> del Edificio <strong>${reclamo.edificio}</strong> creado el día <strong>${reclamo.fechaCreacion}</strong> en <strong>${reclamo.ubicacionAfectada || "la ubicación indicada"}</strong>.</p>
        <p><strong>Ticket:</strong> ${reclamo.ticket}</p>
        <p><strong>Detalle del reclamo:</strong> ${reclamo.detalle}</p>
        <p>Te pedimos tu conformidad sobre la resolución. En caso de no obtener respuesta en las próximas 72hs daremos por confirmada la resolución del mismo.</p>
        <p>Muchas gracias,</p>
        <p><strong>Equipo de Postventa</strong><br>ADN Developers</p>
      `
      }
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || "postventa@adndevelopers.com.ar",
      to: reclamo.email || "cliente@example.com",
      subject: emailSubject,
      html: emailContent,
    }

    try {
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

  agregarDetalleReclamo: asyncHandler(async (req, res) => {
    const { id } = req.params
    const { detalle } = req.body

    if (!detalle) {
      return res.status(400).json({ message: "Se requiere un detalle para agregar" })
    }

    const updatedReclamo = await postVentaService.agregarDetalleReclamo(id, detalle)
    if (updatedReclamo) {
      res.json(updatedReclamo)
    } else {
      res.status(404).json({ message: "Reclamo no encontrado" })
    }
  }),

  eliminarDetalleReclamo: asyncHandler(async (req, res) => {
    const { id, index } = req.params

    const updatedReclamo = await postVentaService.eliminarDetalleReclamo(id, Number.parseInt(index, 10))
    if (updatedReclamo) {
      res.json(updatedReclamo)
    } else {
      res.status(404).json({ message: "Reclamo no encontrado o índice inválido" })
    }
  }),

  updateEstadoReclamo: asyncHandler(async (req, res) => {
    const { id } = req.params
    const { estado } = req.body

    const reclamoAnterior = await postVentaService.getReclamoById(id)
    const estadoAnterior = reclamoAnterior.estado

    const reclamoActualizado = await postVentaService.updateEstadoReclamo(id, estado)

    if (estadoAnterior !== estado) {
      await notificationTriggers.onReclamoStatusChanged(reclamoActualizado, estadoAnterior, estado)
    }

    res.json(reclamoActualizado)
  }),

  cerrarTicket: asyncHandler(async (req, res) => {
    const { id } = req.params
    const { proveedorResolvio, costo, fechaCierre } = req.body

    if (!proveedorResolvio) {
      return res.status(400).json({ message: "Se requiere el proveedor que resolvió el ticket" })
    }

    const ticketCerrado = await postVentaService.cerrarTicket(id, {
      proveedorResolvio,
      costo: costo || 0,
      fechaCierre: fechaCierre || new Date().toISOString().split("T")[0],
    })

    // Enviar correo de cierre automáticamente
    try {
      await postVentaController.enviarCorreo(
        {
          body: {
            reclamo: ticketCerrado,
            tipo: "cierre_ticket",
          },
        },
        res,
      )
    } catch (error) {
      console.error("Error al enviar correo de cierre:", error)
    }

    res.json({ message: "Ticket cerrado exitosamente", reclamo: ticketCerrado })
  }),
}

module.exports = {
  getAllReclamos,
  createReclamo,
  updateReclamo,
  deleteReclamo,
  getReclamoById,
  ...postVentaController,
}
