const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const eventController = require('../controllers/eventController');

router.get('/', authenticateToken, eventController.getAllEvents);
router.post('/', authenticateToken, eventController.createEvent);
router.put('/:id', authenticateToken, eventController.updateEvent);
router.delete('/:id', authenticateToken, eventController.deleteEvent);

module.exports = router;