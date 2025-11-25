const clienteService = require("../services/clienteService")
const asyncHandler = require("../utils/asyncHandler")
const notificationTriggers = require("../triggers/notificationTriggers")

const getAllClientes = asyncHandler(async (req, res) => {
  try {
    console.log("Iniciando obtención de clientes")
    const clientes = await clienteService.getAllClientes()
    console.log("Clientes obtenidos exitosamente")
    res.json(clientes)
  } catch (error) {
    console.error("Error en getAllClientes controller:", error)
    res.status(500).json({ message: "Error al obtener los clientes", error: error.message })
  }
})

const createCliente = asyncHandler(async (req, res) => {
  try {
    console.log("Creando nuevo cliente:", req.body.nombre, req.body.apellido)
    const nuevoCliente = await clienteService.createCliente(req.body)

    // Generar notificación
    console.log("Generando notificación para nuevo cliente")
    await notificationTriggers.onClienteCreated(nuevoCliente)
    console.log("Notificación generada exitosamente")

    res.status(201).json(nuevoCliente)
  } catch (error) {
    console.error("Error al crear cliente:", error)
    res.status(500).json({ message: "Error al crear cliente", error: error.message })
  }
})

const updateCliente = asyncHandler(async (req, res) => {
  await clienteService.updateCliente(req.params.id, req.body)
  res.json({ message: "cliente updated successfully" })
})

const deleteCliente = asyncHandler(async (req, res) => {
  await clienteService.deleteCliente(req.params.id)
  res.json({ message: "cliente deleted successfully" })
})

const updateContactDates = asyncHandler(async (req, res) => {
  await clienteService.updateContactDates(req.params.id, req.body)
  res.json({ message: "Contact dates updated successfully" })
})

module.exports = {
  getAllClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  updateContactDates,
}
