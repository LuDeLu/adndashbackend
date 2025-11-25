const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const agenciaController = require('../controllers/agenciaController');

router.get('/inmobiliarias', authenticateToken, agenciaController.getAllInmobiliarias);
router.get('/emprendimientos', authenticateToken, agenciaController.getAllEmprendimientos);
router.get('/tipologias', authenticateToken, agenciaController.getAllTipologias);

module.exports = router;
