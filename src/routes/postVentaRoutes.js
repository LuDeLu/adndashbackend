const express = require('express');
const router = express.Router();
const postVentaController = require('../controllers/postVentaController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, postVentaController.createReclamo);
router.get('/', authenticateToken, postVentaController.getAllReclamos);
router.get('/:id', authenticateToken, postVentaController.getReclamoById);
router.put('/:id', authenticateToken, postVentaController.updateReclamo);
router.delete('/:id', authenticateToken, postVentaController.deleteReclamo);

module.exports = router;