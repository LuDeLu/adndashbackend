const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const clienteController = require('../controllers/clienteController');

router.get('/', authenticateToken, clienteController.getAllClientes);
router.post('/', authenticateToken, clienteController.createCliente);
router.put('/:id', authenticateToken, clienteController.updateCliente);
router.delete('/:id', authenticateToken, clienteController.deleteCliente);
router.patch('/:id', authenticateToken, clienteController.updateContactDates);

module.exports = router;
