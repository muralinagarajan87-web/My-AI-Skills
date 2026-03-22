const express = require('express');
const {
  createRequirement,
  getRequirements,
  getRequirement,
  updateRequirement,
  deleteRequirement,
  linkTestCases,
  unlinkTestCase,
  getCoverageMatrix,
} = require('../controllers/requirementController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/coverage', authenticateToken, getCoverageMatrix);
router.get('/', authenticateToken, getRequirements);
router.post('/', authenticateToken, createRequirement);
router.get('/:id', authenticateToken, getRequirement);
router.put('/:id', authenticateToken, updateRequirement);
router.delete('/:id', authenticateToken, deleteRequirement);
router.post('/:id/link', authenticateToken, linkTestCases);
router.delete('/:id/unlink/:tc_id', authenticateToken, unlinkTestCase);

module.exports = router;
