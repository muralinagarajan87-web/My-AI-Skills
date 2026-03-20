const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createMilestone, getMilestones, getMilestone, updateMilestone, deleteMilestone } = require('../controllers/milestoneController');

router.post('/', authenticateToken, createMilestone);
router.get('/', authenticateToken, getMilestones);
router.get('/:id', authenticateToken, getMilestone);
router.put('/:id', authenticateToken, updateMilestone);
router.delete('/:id', authenticateToken, deleteMilestone);

module.exports = router;
