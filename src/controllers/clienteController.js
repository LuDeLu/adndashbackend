const clienteService = require('../services/clienteService');
const asyncHandler = require('../utils/asyncHandler');

const getAllClientes = asyncHandler(async (req, res) => {
  try {
    console.log('Iniciando obtención de clientes');
    const clientes = await clienteService.getAllClientes();
    console.log('Clientes obtenidos exitosamente');
    res.json(clientes);
  } catch (error) {
    console.error('Error en getAllClientes controller:', error);
    res.status(500).json({ message: 'Error al obtener los clientes', error: error.message });
  }
});

const createCliente = asyncHandler(async (req, res) => {
  const clienteId = await clienteService.createCliente(req.body);
  res.status(201).json({ 
    id: clienteId, 
    message: 'cliente created successfully' 
  });
});

const updateCliente = asyncHandler(async (req, res) => {
  await clienteService.updateCliente(req.params.id, req.body);
  res.json({ message: 'cliente updated successfully' });
});

const deleteCliente = asyncHandler(async (req, res) => {
  await clienteService.deleteCliente(req.params.id);
  res.json({ message: 'cliente deleted successfully' });
});

const updateContactDates = asyncHandler(async (req, res) => {
  await clienteService.updateContactDates(req.params.id, req.body);
  res.json({ message: 'Contact dates updated successfully' });
});

module.exports = {
  getAllClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  updateContactDates
};
