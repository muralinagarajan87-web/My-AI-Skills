const pool = require('../config/database');

const createComment = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;
    const { content, entity_type, entity_id, mentions } = req.body;

    if (!content) return res.status(400).json({ error: 'content is required' });
    if (!entity_type || !entity_id) return res.status(400).json({ error: 'entity_type and entity_id are required' });

    // Parse @username mentions from content
    const mentionMatches = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentionMatches.push(match[1]);
    }

    // Merge explicit mentions array with auto-parsed mentions
    const allMentions = [...new Set([...(mentions || []), ...mentionMatches])];

    const result = await pool.query(
      `INSERT INTO comments (workspace_id, content, entity_type, entity_id, author_id, mentions)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [workspaceId, content, entity_type, parseInt(entity_id, 10), userId, JSON.stringify(allMentions)]
    );

    // Fetch with author info
    const fullResult = await pool.query(
      `SELECT c.*, u.name AS author_name, u.email AS author_email
       FROM comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ message: 'Comment created', comment: fullResult.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getComments = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const { entity_type, entity_id } = req.query;

    if (!entity_type || !entity_id) {
      return res.status(400).json({ error: 'entity_type and entity_id query params are required' });
    }

    const result = await pool.query(
      `SELECT c.*,
        u.name  AS author_name,
        u.email AS author_email,
        UPPER(LEFT(u.name, 2)) AS author_initials
       FROM comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.workspace_id = $1 AND c.entity_type = $2 AND c.entity_id = $3
       ORDER BY c.created_at ASC`,
      [workspaceId, entity_type, parseInt(entity_id, 10)]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: 'content is required' });

    // Check ownership
    const existing = await pool.query(
      'SELECT * FROM comments WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (existing.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });

    if (existing.rows[0].author_id !== userId) {
      return res.status(403).json({ error: 'Only the author can edit this comment' });
    }

    // Re-parse mentions from updated content
    const mentionMatches = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentionMatches.push(match[1]);
    }

    const result = await pool.query(
      `UPDATE comments SET content = $1, mentions = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [content, JSON.stringify([...new Set(mentionMatches)]), id]
    );

    res.json({ message: 'Comment updated', comment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;

    const existing = await pool.query(
      'SELECT * FROM comments WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (existing.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });

    if (existing.rows[0].author_id !== userId) {
      return res.status(403).json({ error: 'Only the author can delete this comment' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [id]);

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createComment,
  getComments,
  updateComment,
  deleteComment,
};
