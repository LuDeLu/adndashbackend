const agenciaService = require('../services/agenciaService');
const asyncHandler = require('../utils/asyncHandler');

const getAllAgenciasInmobiliarias = asyncHandler(async (req, res) => {
  const agencias = await agenciaService.getAllAgenciasInmobiliarias();
  res.json(agencias);
});

const getAllEmprendimientos = asyncHandler(async (req, res) => {
  const emprendimientos = await agenciaService.getAllEmprendimientos();
  res.json(emprendimientos);
});

const getAllTipologias = asyncHandler(async (req, res) => {
  const tipologias = await agenciaService.getAllTipologias();
  res.json(tipologias);
});

module.exports = {
  getAllAgenciasInmobiliarias,
  getAllEmprendimientos,
  getAllTipologias
};