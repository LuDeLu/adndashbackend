const postVentaService = require('../services/postVentaService');
const asyncHandler = require('../utils/asyncHandler');

const postVentaController = {
  createReclamo: asyncHandler(async (req, res) => {
    const nuevoReclamo = await postVentaService.createReclamo(req.body);
    res.status(201).json(nuevoReclamo);
  }),

  getAllReclamos: asyncHandler(async (req, res) => {
    const reclamos = await postVentaService.getAllReclamos();
    res.json(reclamos);
  }),

  getReclamoById: asyncHandler(async (req, res) => {
    const reclamo = await postVentaService.getReclamoById(req.params.id);
    if (reclamo) {
      res.json(reclamo);
    } else {
      res.status(404).json({ message: 'Reclamo no encontrado' });
    }
  }),

  updateReclamo: asyncHandler(async (req, res) => {
    const updatedReclamo = await postVentaService.updateReclamo(req.params.id, req.body);
    if (updatedReclamo) {
      res.json(updatedReclamo);
    } else {
      res.status(404).json({ message: 'Reclamo no encontrado' });
    }
  }),

  deleteReclamo: asyncHandler(async (req, res) => {
    const deleted = await postVentaService.deleteReclamo(req.params.id);
    if (deleted) {
      res.json({ message: 'Reclamo eliminado con éxito' });
    } else {
      res.status(404).json({ message: 'Reclamo no encontrado' });
    }
  })
};

module.exports = postVentaController;