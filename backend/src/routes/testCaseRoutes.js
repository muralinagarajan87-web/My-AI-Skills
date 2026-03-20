const express = require('express');
const { createTestCase, getTestCases, getTestCase, updateTestCase, deleteTestCase, cloneTestCase } = require('../controllers/testCaseController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, createTestCase);
router.get('/', authenticateToken, getTestCases);
router.get('/:id', authenticateToken, getTestCase);
router.put('/:id', authenticateToken, updateTestCase);
router.delete('/:id', authenticateToken, deleteTestCase);
router.post('/:id/clone', authenticateToken, cloneTestCase);

module.exports = router;
