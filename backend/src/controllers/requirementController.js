const pool = require('../config/database');

const createRequirement = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;
    const { title, description, ref_id, priority, status, external_url } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    const result = await pool.query(
      `INSERT INTO requirements (workspace_id, title, description, ref_id, priority, status, external_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        workspaceId, title, description || null, ref_id || null,
        priority || 'medium', status || 'active', external_url || null, userId,
      ]
    );

    res.status(201).json({ message: 'Requirement created', requirement: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRequirements = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      `SELECT r.*,
        u.name AS created_by_name,
        COUNT(rtc.test_case_id) AS linked_test_case_count
       FROM requirements r
       LEFT JOIN users u ON r.created_by = u.id
       LEFT JOIN requirement_test_cases rtc ON rtc.requirement_id = r.id
       WHERE r.workspace_id = $1
       GROUP BY r.id, u.name
       ORDER BY r.created_at DESC`,
      [workspaceId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    const reqResult = await pool.query(
      `SELECT r.*, u.name AS created_by_name
       FROM requirements r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = $1 AND r.workspace_id = $2`,
      [id, workspaceId]
    );

    if (reqResult.rows.length === 0) return res.status(404).json({ error: 'Requirement not found' });

    // Get linked test cases with full details
    const tcResult = await pool.query(
      `SELECT tc.*, rtc.created_at AS linked_at
       FROM test_cases tc
       JOIN requirement_test_cases rtc ON rtc.test_case_id = tc.id
       WHERE rtc.requirement_id = $1
       ORDER BY tc.title ASC`,
      [id]
    );

    res.json({
      ...reqResult.rows[0],
      test_cases: tcResult.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    const { title, description, ref_id, priority, status, external_url } = req.body;

    const result = await pool.query(
      `UPDATE requirements
       SET title        = COALESCE($1, title),
           description  = COALESCE($2, description),
           ref_id       = COALESCE($3, ref_id),
           priority     = COALESCE($4, priority),
           status       = COALESCE($5, status),
           external_url = COALESCE($6, external_url),
           updated_at   = CURRENT_TIMESTAMP
       WHERE id = $7 AND workspace_id = $8
       RETURNING *`,
      [title || null, description || null, ref_id || null, priority || null,
       status || null, external_url || null, id, workspaceId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Requirement not found' });

    res.json({ message: 'Requirement updated', requirement: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    // Links are removed via CASCADE, but explicit removal for clarity
    await pool.query('DELETE FROM requirement_test_cases WHERE requirement_id = $1', [id]);

    const result = await pool.query(
      'DELETE FROM requirements WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [id, workspaceId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Requirement not found' });

    res.json({ message: 'Requirement deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const linkTestCases = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;
    const { test_case_ids } = req.body;

    if (!Array.isArray(test_case_ids) || test_case_ids.length === 0) {
      return res.status(400).json({ error: 'test_case_ids array is required' });
    }

    // Verify requirement belongs to workspace
    const reqCheck = await pool.query(
      'SELECT id FROM requirements WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );
    if (reqCheck.rows.length === 0) return res.status(404).json({ error: 'Requirement not found' });

    for (const tcId of test_case_ids) {
      await pool.query(
        `INSERT INTO requirement_test_cases (requirement_id, test_case_id, linked_by)
         VALUES ($1,$2,$3)
         ON CONFLICT (requirement_id, test_case_id) DO NOTHING`,
        [id, tcId, userId]
      );
    }

    res.json({ message: `${test_case_ids.length} test case(s) linked to requirement` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const unlinkTestCase = async (req, res) => {
  try {
    const { id, tc_id } = req.params;
    const workspaceId = req.user.workspace_id;

    // Verify requirement belongs to workspace
    const reqCheck = await pool.query(
      'SELECT id FROM requirements WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );
    if (reqCheck.rows.length === 0) return res.status(404).json({ error: 'Requirement not found' });

    const result = await pool.query(
      'DELETE FROM requirement_test_cases WHERE requirement_id = $1 AND test_case_id = $2 RETURNING requirement_id',
      [id, tc_id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Link not found' });

    res.json({ message: 'Test case unlinked from requirement' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCoverageMatrix = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;

    // Get all requirements with their linked test cases and latest results
    const result = await pool.query(
      `SELECT
        r.id            AS requirement_id,
        r.title         AS requirement_title,
        r.ref_id,
        r.priority,
        r.status        AS requirement_status,
        tc.id           AS test_case_id,
        tc.title        AS test_case_title,
        tc.priority     AS test_case_priority,
        tc.status       AS test_case_status,
        latest.result   AS latest_result
       FROM requirements r
       LEFT JOIN requirement_test_cases rtc ON rtc.requirement_id = r.id
       LEFT JOIN test_cases tc ON tc.id = rtc.test_case_id
       LEFT JOIN LATERAL (
         SELECT tr.result
         FROM test_results tr
         JOIN test_runs run ON tr.test_run_id = run.id
         WHERE tr.test_case_id = tc.id AND run.workspace_id = $1
         ORDER BY tr.created_at DESC
         LIMIT 1
       ) latest ON TRUE
       WHERE r.workspace_id = $1
       ORDER BY r.id, tc.id`,
      [workspaceId]
    );

    // Group by requirement
    const requirementsMap = new Map();
    for (const row of result.rows) {
      if (!requirementsMap.has(row.requirement_id)) {
        requirementsMap.set(row.requirement_id, {
          id: row.requirement_id,
          title: row.requirement_title,
          ref_id: row.ref_id,
          priority: row.priority,
          status: row.requirement_status,
          test_cases: [],
        });
      }

      if (row.test_case_id) {
        requirementsMap.get(row.requirement_id).test_cases.push({
          id: row.test_case_id,
          title: row.test_case_title,
          priority: row.test_case_priority,
          status: row.test_case_status,
          latest_result: row.latest_result || 'Not Run',
        });
      }
    }

    // Compute coverage percentage per requirement
    const matrix = Array.from(requirementsMap.values()).map((req) => {
      const total = req.test_cases.length;
      const passed = req.test_cases.filter((tc) => tc.latest_result === 'Pass').length;
      const failed = req.test_cases.filter((tc) => tc.latest_result === 'Fail').length;
      const notRun = req.test_cases.filter((tc) => tc.latest_result === 'Not Run').length;
      const coverage_pct = total > 0 ? Math.round(((passed + failed) / total) * 100) : 0;

      return {
        ...req,
        coverage: { total, passed, failed, not_run: notRun, coverage_pct },
      };
    });

    res.json(matrix);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createRequirement,
  getRequirements,
  getRequirement,
  updateRequirement,
  deleteRequirement,
  linkTestCases,
  unlinkTestCase,
  getCoverageMatrix,
};
