const pool = require('../config/database');

const getWorkspaces = async (req, res) => {
  try {
    const userId = req.user.id;
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      'SELECT * FROM workspaces WHERE owner_id = $1 OR id = $2 ORDER BY created_at DESC',
      [userId, workspaceId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query('SELECT * FROM workspaces WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = result.rows[0];

    // Only allow viewing if user is owner or currently in that workspace
    if (workspace.owner_id !== userId && req.user.workspace_id !== workspace.id) {
      return res.status(403).json({ error: 'Not authorized to view this workspace' });
    }

    res.json(workspace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createWorkspace = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const result = await pool.query(
      'INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name, userId]
    );

    // Switch current user to new workspace
    await pool.query('UPDATE users SET workspace_id = $1 WHERE id = $2', [result.rows[0].id, userId]);

    res.status(201).json({ message: 'Workspace created', workspace: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const switchWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const workspaceResult = await pool.query('SELECT * FROM workspaces WHERE id = $1', [id]);
    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = workspaceResult.rows[0];

    // Only allow switching to workspaces you own (or are already in)
    if (workspace.owner_id !== userId && req.user.workspace_id !== workspace.id) {
      return res.status(403).json({ error: 'Not authorized to switch to this workspace' });
    }

    await pool.query('UPDATE users SET workspace_id = $1 WHERE id = $2', [workspace.id, userId]);

    res.json({ message: 'Workspace switched', workspace });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getWorkspaces, getWorkspace, createWorkspace, switchWorkspace };