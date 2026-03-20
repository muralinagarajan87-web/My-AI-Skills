const pool = require('../config/database');

const createTemplate = async (req, res) => {
  try {
    const { name, description, fields } = req.body;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO templates (workspace_id, name, description, fields, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [workspaceId, name, description, JSON.stringify(fields), userId]
    );

    // Log to audit
    await pool.query(
      `INSERT INTO audit_log (workspace_id, user_id, action, entity_type, entity_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [workspaceId, userId, 'CREATE', 'TEMPLATE', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    res.status(201).json({ message: 'Template created', template: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTemplates = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const result = await pool.query(
      'SELECT * FROM templates WHERE workspace_id = $1 ORDER BY created_at DESC',
      [workspaceId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      'SELECT * FROM templates WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, fields } = req.body;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;

    // Get old values
    const oldResult = await pool.query('SELECT * FROM templates WHERE id = $1', [id]);
    const oldValue = oldResult.rows[0];

    // Update
    const result = await pool.query(
      `UPDATE templates SET name = $1, description = $2, fields = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND workspace_id = $5 RETURNING *`,
      [name, description, JSON.stringify(fields), id, workspaceId]
    );

    // Log to audit
    await pool.query(
      `INSERT INTO audit_log (workspace_id, user_id, action, entity_type, entity_id, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [workspaceId, userId, 'UPDATE', 'TEMPLATE', id, JSON.stringify(oldValue), JSON.stringify(result.rows[0])]
    );

    res.json({ message: 'Template updated', template: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;

    // Log deletion
    const oldResult = await pool.query('SELECT * FROM templates WHERE id = $1', [id]);
    await pool.query(
      `INSERT INTO audit_log (workspace_id, user_id, action, entity_type, entity_id, old_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [workspaceId, userId, 'DELETE', 'TEMPLATE', id, JSON.stringify(oldResult.rows[0])]
    );

    // Delete
    const result = await pool.query(
      'DELETE FROM templates WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createTemplate, getTemplates, getTemplate, updateTemplate, deleteTemplate };
