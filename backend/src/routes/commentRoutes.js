const express = require('express');
const {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} = require('../controllers/commentController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, getComments);
router.post('/', authenticateToken, createComment);
router.put('/:id', authenticateToken, updateComment);
router.delete('/:id', authenticateToken, deleteComment);

module.exports = router;
