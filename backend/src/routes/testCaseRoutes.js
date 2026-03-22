const express = require('express');
const { createTestCase, getTestCases, getTestCase, updateTestCase, deleteTestCase, cloneTestCase, bulkDeleteTestCases, bulkUpdateTestCases, bulkMoveTestCases, getVersionHistory, restoreVersion } = require('../controllers/testCaseController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, createTestCase);
router.get('/', authenticateToken, getTestCases);
router.post('/bulk-delete', authenticateToken, bulkDeleteTestCases);
router.delete('/bulk', authenticateToken, bulkDeleteTestCases);
router.put('/bulk', authenticateToken, bulkUpdateTestCases);
router.put('/bulk/move', authenticateToken, bulkMoveTestCases);
router.get('/:id', authenticateToken, getTestCase);
router.put('/:id', authenticateToken, updateTestCase);
router.delete('/:id', authenticateToken, deleteTestCase);
router.post('/:id/clone', authenticateToken, cloneTestCase);
router.get('/:id/versions', authenticateToken, getVersionHistory);
router.post('/:id/restore/:versionId', authenticateToken, restoreVersion);

module.exports = router;
