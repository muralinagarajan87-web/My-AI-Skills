const express = require('express');
const {
  upload,
  uploadAttachment,
  getAttachments,
  deleteAttachment,
  downloadAttachment,
} = require('../controllers/attachmentController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, upload.single('file'), uploadAttachment);
router.get('/', authenticateToken, getAttachments);
router.delete('/:id', authenticateToken, deleteAttachment);
router.get('/:id/download', authenticateToken, downloadAttachment);

module.exports = router;
