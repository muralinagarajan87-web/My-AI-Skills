const express = require('express');
const {
  getReportMetrics,
  getAuditLog,
  getTestCaseHistory,
  getTestCaseResults
} = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/metrics', authenticateToken, getReportMetrics);
router.get('/audit-log', authenticateToken, getAuditLog);
router.get('/history/:testCaseId', authenticateToken, getTestCaseHistory);
router.get('/results/:testCaseId', authenticateToken, getTestCaseResults);

module.exports = router;
