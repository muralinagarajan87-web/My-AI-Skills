const express = require('express');
const {
  createEnvironment,
  getEnvironments,
  updateEnvironment,
  deleteEnvironment,
  getEnvironmentStats,
} = require('../controllers/environmentController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, getEnvironments);
router.post('/', authenticateToken, createEnvironment);
router.get('/:id/stats', authenticateToken, getEnvironmentStats);
router.put('/:id', authenticateToken, updateEnvironment);
router.delete('/:id', authenticateToken, deleteEnvironment);

module.exports = router;
