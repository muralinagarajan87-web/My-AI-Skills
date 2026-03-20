const pool = require('../config/database');

const getReportMetrics = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const runId = req.query.run_id ? parseInt(req.query.run_id, 10) : null;

    // Total test cases (always workspace-level)
    const totalCases = await pool.query(
      'SELECT COUNT(*) as count FROM test_cases WHERE workspace_id = $1',
      [workspaceId]
    );

    // Test runs summary (always workspace-level)
    const runsData = await pool.query(
      `SELECT
        COUNT(*) as total_runs,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_runs
       FROM test_runs WHERE workspace_id = $1`,
      [workspaceId]
    );

    let passFailCounts;

    if (runId) {
      // Metrics for a specific test run
      const runResults = await pool.query(
        `SELECT
          SUM(CASE WHEN result = 'Pass' THEN 1 ELSE 0 END) as total_passed,
          SUM(CASE WHEN result = 'Fail' THEN 1 ELSE 0 END) as total_failed,
          SUM(CASE WHEN result = 'Skip' THEN 1 ELSE 0 END) as total_skipped,
          COUNT(*) as total_executed
         FROM test_results
         WHERE test_run_id = $1`,
        [runId]
      );
      passFailCounts = runResults.rows[0];
    } else {
      // Overall metrics across all runs in workspace
      const allResults = await pool.query(
        `SELECT
          SUM(CASE WHEN result = 'Pass' THEN 1 ELSE 0 END) as total_passed,
          SUM(CASE WHEN result = 'Fail' THEN 1 ELSE 0 END) as total_failed,
          SUM(CASE WHEN result = 'Skip' THEN 1 ELSE 0 END) as total_skipped,
          COUNT(*) as total_executed
         FROM test_results
         WHERE test_run_id IN (SELECT id FROM test_runs WHERE workspace_id = $1)`,
        [workspaceId]
      );
      passFailCounts = allResults.rows[0];
    }

    res.json({
      total_test_cases: totalCases.rows[0].count,
      total_runs: runsData.rows[0].total_runs,
      completed_runs: runsData.rows[0].completed_runs,
      pass_fail_counts: passFailCounts,
      filtered_by_run: runId || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAuditLog = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const limit = req.query.limit || 100;

    const result = await pool.query(
      `SELECT al.*, u.name as user_name
       FROM audit_log al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.workspace_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [workspaceId, limit]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTestCaseHistory = async (req, res) => {
  try {
    const { testCaseId } = req.params;
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      `SELECT v.*, u.name as changed_by_name
       FROM test_case_versions v
       LEFT JOIN users u ON v.changed_by = u.id
       WHERE v.test_case_id = $1
       ORDER BY v.created_at DESC`,
      [testCaseId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTestCaseResults = async (req, res) => {
  try {
    const { testCaseId } = req.params;
    const workspaceId = req.user.workspace_id;

    // Get result counts by status for this test case across all runs in the workspace
    const result = await pool.query(
      `SELECT tr.result, COUNT(*) as count
       FROM test_results tr
       JOIN test_runs r ON tr.test_run_id = r.id
       WHERE tr.test_case_id = $1 AND r.workspace_id = $2
       GROUP BY tr.result`,
      [testCaseId, workspaceId]
    );

    const counts = result.rows.reduce((acc, row) => {
      const key = row.result || 'Not Started';
      acc[key] = parseInt(row.count, 10);
      return acc;
    }, {});

    const total = Object.values(counts).reduce((sum, v) => sum + v, 0);

    res.json({ total, counts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getReportMetrics,
  getAuditLog,
  getTestCaseHistory,
  getTestCaseResults
};
