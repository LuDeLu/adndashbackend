
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const upload = require('../config/multerConfig');

router.get('/', projectController.getAllProjects);
router.post('/', upload.single('brochure'), projectController.createProject);
router.patch('/:id/units', projectController.updateProjectUnits);
router.get('/:id/brochure', projectController.getBrochure);

module.exports = router;