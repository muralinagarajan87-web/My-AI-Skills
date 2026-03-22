const pool = require('../config/database');

const createEnvironment = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;
    const { name, url, env_type, description } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await pool.query(
      `INSERT INTO environments (workspace_id, name, url, env_type, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [workspaceId, name, url || null, env_type || 'custom', description || null, userId]
    );

    res.status(201).json({ message: 'Environment created', environment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getEnvironments = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      `SELECT e.*, u.name AS created_by_name,
        (SELECT COUNT(*) FROM test_runs WHERE environment_id = e.id) AS test_run_count
       FROM environments e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.workspace_id = $1
       ORDER BY e.created_at DESC`,
      [workspaceId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateEnvironment = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    const { name, url, env_type, description, is_active } = req.body;

    const result = await pool.query(
      `UPDATE environments
       SET name        = COALESCE($1, name),
           url         = COALESCE($2, url),
           env_type    = COALESCE($3, env_type),
           description = COALESCE($4, description),
           is_active   = COALESCE($5, is_active),
           updated_at  = CURRENT_TIMESTAMP
       WHERE id = $6 AND workspace_id = $7
       RETURNING *`,
      [name || null, url || null, env_type || null, description || null,
       is_active !== undefined ? is_active : null, id, workspaceId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Environment not found' });

    res.json({ message: 'Environment updated', environment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteEnvironment = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      'DELETE FROM environments WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [id, workspaceId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Environment not found' });

    res.json({ message: 'Environment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getEnvironmentStats = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    // Verify environment belongs to workspace
    const envCheck = await pool.query(
      'SELECT * FROM environments WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (envCheck.rows.length === 0) return res.status(404).json({ error: 'Environment not found' });

    const runsResult = await pool.query(
      `SELECT
        COUNT(*) AS total_runs,
        COUNT(*) FILTER (WHERE status = 'Completed') AS completed_runs,
        COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress_runs
       FROM test_runs WHERE environment_id = $1`,
      [id]
    );

    const resultsResult = await pool.query(
      `SELECT
        COUNT(*) AS total_results,
        COUNT(*) FILTER (WHERE tr.result = 'Pass') AS passed,
        COUNT(*) FILTER (WHERE tr.result = 'Fail') AS failed,
        COUNT(*) FILTER (WHERE tr.result = 'Skip') AS skipped
       FROM test_results tr
       JOIN test_runs run ON tr.test_run_id = run.id
       WHERE run.environment_id = $1`,
      [id]
    );

    const runs = runsResult.rows[0];
    const results = resultsResult.rows[0];

    res.json({
      environment: envCheck.rows[0],
      runs: {
        total:       parseInt(runs.total_runs, 10),
        completed:   parseInt(runs.completed_runs, 10),
        in_progress: parseInt(runs.in_progress_runs, 10),
      },
      results: {
        total:   parseInt(results.total_results, 10),
        passed:  parseInt(results.passed, 10),
        failed:  parseInt(results.failed, 10),
        skipped: parseInt(results.skipped, 10),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createEnvironment,
  getEnvironments,
  updateEnvironment,
  deleteEnvironment,
  getEnvironmentStats,
};
