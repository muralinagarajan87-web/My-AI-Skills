const pool = require('../config/database');

const createTestRun = async (req, res) => {
  try {
    const { name, description, test_case_ids } = req.body;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO test_runs (workspace_id, name, description, created_by, status)
       VALUES ($1, $2, $3, $4, 'In Progress') RETURNING *`,
      [workspaceId, name, description, userId]
    );

    const testRun = result.rows[0];

    // Create test results for each test case
    if (test_case_ids && test_case_ids.length > 0) {
      for (const caseId of test_case_ids) {
        await pool.query(
          `INSERT INTO test_results (test_run_id, test_case_id, status)
           VALUES ($1, $2, $3)`,
          [testRun.id, caseId, 'Not Started']
        );
      }
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (workspace_id, user_id, action, entity_type, entity_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [workspaceId, userId, 'CREATE', 'TEST_RUN', testRun.id, JSON.stringify(testRun)]
    );

    res.status(201).json({ message: 'Test run created', testRun });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTestRuns = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const result = await pool.query(
      `SELECT tr.*,
        COUNT(res.id) AS total_count,
        SUM(CASE WHEN res.result = 'Pass' THEN 1 ELSE 0 END) AS pass_count,
        SUM(CASE WHEN res.result = 'Fail' THEN 1 ELSE 0 END) AS fail_count,
        SUM(CASE WHEN res.result = 'Skip' THEN 1 ELSE 0 END) AS skip_count,
        SUM(CASE WHEN res.result IS NULL OR res.result = 'Not Started' THEN 1 ELSE 0 END) AS pending_count,
        CASE
          WHEN COUNT(res.id) > 0 AND SUM(CASE WHEN res.result IS NULL OR res.result = 'Not Started' THEN 1 ELSE 0 END) = 0
            THEN 'Completed'
          WHEN COUNT(res.id) > 0
            THEN 'In Progress'
          ELSE COALESCE(tr.status, 'In Progress')
        END AS computed_status
       FROM test_runs tr
       LEFT JOIN test_results res ON res.test_run_id = tr.id
       WHERE tr.workspace_id = $1
       GROUP BY tr.id
       ORDER BY tr.created_at DESC`,
      [workspaceId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTestRun = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    const runResult = await pool.query(
      'SELECT * FROM test_runs WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (runResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test run not found' });
    }

    // Get test results
    const resultsResult = await pool.query(
      `SELECT tr.*, tc.title as test_case_title
       FROM test_results tr
       JOIN test_cases tc ON tr.test_case_id = tc.id
       WHERE tr.test_run_id = $1
       ORDER BY tr.created_at`,
      [id]
    );

    const results = resultsResult.rows;
    const totalCount = results.length;
    const pendingCount = results.filter(r => !r.result || r.result === 'Not Started').length;
    const computedStatus = totalCount > 0 && pendingCount === 0 ? 'Completed' : 'In Progress';

    res.json({
      ...runResult.rows[0],
      computed_status: computedStatus,
      pending_count: pendingCount,
      total_count: totalCount,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTestResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { result_status, comments, assigned_to } = req.body;
    const userId = req.user.id;
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      `UPDATE test_results
       SET status = $1, result = $2, comments = $3, assigned_to = $4, executed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [result_status, result_status, comments, assigned_to, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test result not found' });
    }

    const updatedResult = result.rows[0];
    const testRunId = updatedResult.test_run_id;

    // Check if all test results in this run are now executed (no "Not Started" or null results)
    const pendingCheck = await pool.query(
      `SELECT COUNT(*) as pending
       FROM test_results
       WHERE test_run_id = $1 AND (result IS NULL OR result = 'Not Started')`,
      [testRunId]
    );

    const pending = parseInt(pendingCheck.rows[0].pending, 10);

    if (pending === 0) {
      // All test cases executed — auto-complete the run
      await pool.query(
        `UPDATE test_runs SET status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [testRunId]
      );
    } else {
      // Ensure run is marked as In Progress
      await pool.query(
        `UPDATE test_runs SET status = 'In Progress', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status != 'In Progress'`,
        [testRunId]
      );
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (workspace_id, user_id, action, entity_type, entity_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [workspaceId, userId, 'UPDATE', 'TEST_RESULT', id, JSON.stringify(updatedResult)]
    );

    res.json({ message: 'Test result updated', result: updatedResult });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTestRunStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE test_runs 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND workspace_id = $3 RETURNING *`,
      [status, id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test run not found' });
    }

    res.json({ message: 'Test run status updated', testRun: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createTestRun,
  getTestRuns,
  getTestRun,
  updateTestResult,
  updateTestRunStatus
};
