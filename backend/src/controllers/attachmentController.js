const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;
    const { entity_type, entity_id } = req.body;

    if (!entity_type || !entity_id) {
      // Clean up uploaded file on validation error
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'entity_type and entity_id are required' });
    }

    const result = await pool.query(
      `INSERT INTO attachments
        (workspace_id, file_name, original_name, file_type, file_size, file_path, entity_type, entity_id, uploader_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        workspaceId,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        req.file.path,
        entity_type,
        parseInt(entity_id, 10),
        userId,
      ]
    );

    res.status(201).json({ message: 'File uploaded', attachment: result.rows[0] });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: error.message });
  }
};

const getAttachments = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const { entity_type, entity_id } = req.query;

    if (!entity_type || !entity_id) {
      return res.status(400).json({ error: 'entity_type and entity_id query params are required' });
    }

    const result = await pool.query(
      `SELECT a.*, u.name AS uploader_name
       FROM attachments a
       LEFT JOIN users u ON a.uploader_id = u.id
       WHERE a.workspace_id = $1 AND a.entity_type = $2 AND a.entity_id = $3
       ORDER BY a.created_at DESC`,
      [workspaceId, entity_type, parseInt(entity_id, 10)]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    const attachmentResult = await pool.query(
      'SELECT * FROM attachments WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (attachmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = attachmentResult.rows[0];

    // Delete DB record
    await pool.query('DELETE FROM attachments WHERE id = $1', [id]);

    // Delete file from disk
    fs.unlink(attachment.file_path, (err) => {
      if (err) console.error('Failed to delete file from disk:', err.message);
    });

    res.json({ message: 'Attachment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const downloadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      'SELECT * FROM attachments WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];

    if (!fs.existsSync(attachment.file_path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_name || attachment.file_name}"`);

    const stream = fs.createReadStream(attachment.file_path);
    stream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  upload,
  uploadAttachment,
  getAttachments,
  deleteAttachment,
  downloadAttachment,
};
