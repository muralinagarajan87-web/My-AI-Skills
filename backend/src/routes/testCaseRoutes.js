const express = require('express');
const { createTestCase, getTestCases, getTestCase, updateTestCase, deleteTestCase, cloneTestCase, bulkDeleteTestCases, bulkUpdateTestCases, bulkMoveTestCases } = require('../controllers/testCaseController');
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

module.exports = router;
