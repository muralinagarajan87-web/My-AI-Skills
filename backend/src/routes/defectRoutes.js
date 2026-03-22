const express = require('express');
const {
  createDefect,
  getDefects,
  getDefect,
  updateDefect,
  deleteDefect,
  syncGitHub,
  getDefectStats,
} = require('../controllers/defectController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticateToken, getDefectStats);
router.get('/', authenticateToken, getDefects);
router.post('/', authenticateToken, createDefect);
router.get('/:id', authenticateToken, getDefect);
router.put('/:id', authenticateToken, updateDefect);
router.delete('/:id', authenticateToken, deleteDefect);
router.post('/:id/sync-github', authenticateToken, syncGitHub);

module.exports = router;
