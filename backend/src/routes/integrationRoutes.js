const express = require('express');
const {
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  receiveWebhook,
} = require('../controllers/integrationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public webhook endpoint — no auth
router.post('/webhook/:token', receiveWebhook);

router.get('/', authenticateToken, getIntegrations);
router.post('/', authenticateToken, createIntegration);
router.put('/:id', authenticateToken, updateIntegration);
router.delete('/:id', authenticateToken, deleteIntegration);
router.post('/:id/test', authenticateToken, testIntegration);

module.exports = router;
