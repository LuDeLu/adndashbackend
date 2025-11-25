const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const userController = require('../controllers/userController');

router.get('/', authenticateToken, authorizeRoles('admin', 'superadmin'), userController.getAllUsers);
router.patch('/:id/role', authenticateToken, authorizeRoles('admin', 'superadmin'), userController.updateUserRole);

module.exports = router;
