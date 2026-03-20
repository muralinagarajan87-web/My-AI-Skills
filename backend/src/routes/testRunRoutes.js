const express = require('express');
const { createTestRun, getTestRuns, getTestRun, updateTestResult, updateTestRunStatus } = require('../controllers/testRunController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, createTestRun);
router.get('/', authenticateToken, getTestRuns);
router.get('/:id', authenticateToken, getTestRun);
router.put('/:id/status', authenticateToken, updateTestRunStatus);
router.put('/result/:id', authenticateToken, updateTestResult);

router.put('/:id/milestone', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { milestone_id } = req.body;
    const pool = require('../config/database');
    const result = await pool.query(
      'UPDATE test_runs SET milestone_id=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',
      [milestone_id, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
