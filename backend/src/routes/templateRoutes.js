const express = require('express');
const { createTemplate, getTemplates, getTemplate, updateTemplate, deleteTemplate } = require('../controllers/templateController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, createTemplate);
router.get('/', authenticateToken, getTemplates);
router.get('/:id', authenticateToken, getTemplate);
router.put('/:id', authenticateToken, updateTemplate);
router.delete('/:id', authenticateToken, deleteTemplate);

module.exports = router;
