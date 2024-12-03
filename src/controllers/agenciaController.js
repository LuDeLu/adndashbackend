const agenciaService = require('../services/agenciaService');
const asyncHandler = require('../utils/asyncHandler');

const agenciaController = {
  getAllInmobiliarias: asyncHandler(async (req, res) => {
    try {
      const inmobiliarias = await agenciaService.getAllAgenciasInmobiliarias();
      res.json(inmobiliarias);
    } catch (error) {
      console.error('Error al obtener inmobiliarias:', error);
      res.status(500).json({ message: 'Error al obtener inmobiliarias', error: error.message });
    }
  }),

  getAllEmprendimientos: asyncHandler(async (req, res) => {
    try {
      const emprendimientos = await agenciaService.getAllEmprendimientos();
      res.json(emprendimientos);
    } catch (error) {
      console.error('Error al obtener emprendimientos:', error);
      res.status(500).json({ message: 'Error al obtener emprendimientos', error: error.message });
    }
  }),

  getAllTipologias: asyncHandler(async (req, res) => {
    try {
      const tipologias = await agenciaService.getAllTipologias();
      res.json(tipologias);
    } catch (error) {
      console.error('Error al obtener tipologías:', error);
      res.status(500).json({ message: 'Error al obtener tipologías', error: error.message });
    }
  })
};

module.exports = agenciaController;

