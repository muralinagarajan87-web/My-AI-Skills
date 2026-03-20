const express = require('express');
const { getWorkspaces, getWorkspace, createWorkspace, switchWorkspace } = require('../controllers/workspaceController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, getWorkspaces);
router.get('/:id', authenticateToken, getWorkspace);
router.post('/', authenticateToken, createWorkspace);
router.post('/:id/switch', authenticateToken, switchWorkspace);

module.exports = router;
