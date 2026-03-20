const pool = require('../config/database');

const createMilestone = async (req, res) => {
  try {
    const { name, description, refs, start_date, due_date } = req.body;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;
    const result = await pool.query(
      `INSERT INTO milestones (workspace_id, name, description, refs, start_date, due_date, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Open') RETURNING *`,
      [workspaceId, name, description, refs, start_date || null, due_date || null, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMilestones = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const result = await pool.query(
      `SELECT m.*,
        COUNT(DISTINCT tr.id) AS total_runs,
        COUNT(res.id) AS total_tests,
        SUM(CASE WHEN res.result = 'Pass' THEN 1 ELSE 0 END) AS pass_count,
        SUM(CASE WHEN res.result = 'Fail' THEN 1 ELSE 0 END) AS fail_count,
        SUM(CASE WHEN res.result = 'Skip' THEN 1 ELSE 0 END) AS skip_count,
        SUM(CASE WHEN res.result IS NULL OR res.result = 'Not Started' THEN 1 ELSE 0 END) AS pending_count
       FROM milestones m
       LEFT JOIN test_runs tr ON tr.milestone_id = m.id
       LEFT JOIN test_results res ON res.test_run_id = tr.id
       WHERE m.workspace_id = $1
       GROUP BY m.id
       ORDER BY m.created_at DESC`,
      [workspaceId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    const ms = await pool.query(
      'SELECT * FROM milestones WHERE id=$1 AND workspace_id=$2',
      [id, workspaceId]
    );
    if (ms.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const runs = await pool.query(
      `SELECT tr.*,
        COUNT(res.id) AS total_count,
        SUM(CASE WHEN res.result = 'Pass' THEN 1 ELSE 0 END) AS pass_count,
        SUM(CASE WHEN res.result = 'Fail' THEN 1 ELSE 0 END) AS fail_count,
        SUM(CASE WHEN res.result = 'Skip' THEN 1 ELSE 0 END) AS skip_count,
        SUM(CASE WHEN res.result IS NULL OR res.result = 'Not Started' THEN 1 ELSE 0 END) AS pending_count,
        CASE WHEN COUNT(res.id) > 0 AND SUM(CASE WHEN res.result IS NULL OR res.result = 'Not Started' THEN 1 ELSE 0 END) = 0
          THEN 'Completed' ELSE 'In Progress' END AS computed_status
       FROM test_runs tr
       LEFT JOIN test_results res ON res.test_run_id = tr.id
       WHERE tr.milestone_id = $1
       GROUP BY tr.id
       ORDER BY tr.created_at DESC`,
      [id]
    );
    res.json({ ...ms.rows[0], test_runs: runs.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, refs, start_date, due_date, status } = req.body;
    const workspaceId = req.user.workspace_id;
    const result = await pool.query(
      `UPDATE milestones SET name=$1, description=$2, refs=$3, start_date=$4, due_date=$5, status=$6, updated_at=CURRENT_TIMESTAMP
       WHERE id=$7 AND workspace_id=$8 RETURNING *`,
      [name, description, refs, start_date || null, due_date || null, status, id, workspaceId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    // FIX BUG-06: return 404 when nothing was deleted
    const result = await pool.query('DELETE FROM milestones WHERE id=$1 AND workspace_id=$2 RETURNING id', [id, workspaceId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createMilestone, getMilestones, getMilestone, updateMilestone, deleteMilestone };
