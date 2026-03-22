const pool = require('../config/database');

const getReportMetrics = async (req, res) => {
  try {
    const workspaceId = req.query.project_id ? parseInt(req.query.project_id, 10) : req.user.workspace_id;
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

    // FIX BUG-08: verify the test case belongs to the user's workspace before returning history
    const ownerCheck = await pool.query(
      'SELECT id FROM test_cases WHERE id = $1 AND workspace_id = $2',
      [testCaseId, workspaceId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }

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

const safeQuery = async (pool, sql, params = []) => {
  try {
    return await pool.query(sql, params);
  } catch (e) {
    console.error('Dashboard query error:', e.message, sql.slice(0, 80));
    return { rows: [{}] };
  }
};

const getDashboardAnalytics = async (req, res) => {
  try {
    const workspaceId = req.query.project_id ? parseInt(req.query.project_id, 10) : req.user.workspace_id;

    // 1. Total cases
    const totalCasesQ = await safeQuery(pool, 'SELECT COUNT(*) as count FROM test_cases WHERE workspace_id = $1', [workspaceId]);
    const totalCases = parseInt(totalCasesQ.rows[0].count || 0, 10);

    // 2. Executed cases (have at least one result)
    const executedCasesQ = await safeQuery(pool,
      `SELECT COUNT(DISTINCT tr.test_case_id) as count FROM test_results tr
       JOIN test_runs run ON tr.test_run_id = run.id WHERE run.workspace_id = $1`, [workspaceId]
    );
    const executedCases = parseInt(executedCasesQ.rows[0].count || 0, 10);

    // 3. Overall pass rate
    const overallPassQ = await safeQuery(pool,
      `SELECT SUM(CASE WHEN result = 'Pass' THEN 1 ELSE 0 END) as passed, COUNT(*) as total
       FROM test_results tr JOIN test_runs run ON tr.test_run_id = run.id WHERE run.workspace_id = $1`, [workspaceId]
    );
    const oPass = parseInt(overallPassQ.rows[0].passed || 0, 10);
    const oTotal = parseInt(overallPassQ.rows[0].total || 0, 10);
    const overallPassRate = oTotal > 0 ? Math.round((oPass / oTotal) * 100) : 0;

    // 4. Critical pass rate
    const criticalPassQ = await safeQuery(pool,
      `SELECT SUM(CASE WHEN tr.result = 'Pass' THEN 1 ELSE 0 END) as passed, COUNT(*) as total
       FROM test_results tr
       JOIN test_cases tc ON tr.test_case_id = tc.id
       JOIN test_runs run ON tr.test_run_id = run.id
       WHERE run.workspace_id = $1 AND tc.priority IN ('Critical','P0','High','P1')`, [workspaceId]
    );
    const cPass = parseInt(criticalPassQ.rows[0].passed || 0, 10);
    const cTotal = parseInt(criticalPassQ.rows[0].total || 0, 10);
    const criticalPassRate = cTotal > 0 ? Math.round((cPass / cTotal) * 100) : null;

    // 5. Draft count
    const draftQ = await safeQuery(pool, `SELECT COUNT(*) as count FROM test_cases WHERE workspace_id = $1 AND status = 'Draft'`, [workspaceId]);
    const draftCount = parseInt(draftQ.rows[0].count || 0, 10);

    // Release readiness score
    const coveragePct = totalCases > 0 ? (executedCases / totalCases) * 100 : 0;
    const criticalPct = criticalPassRate !== null ? criticalPassRate : overallPassRate;
    const readinessScore = Math.round(coveragePct * 0.35 + overallPassRate * 0.30 + criticalPct * 0.35);

    // 6. Coverage by priority
    const coverageByPriorityQ = await safeQuery(pool,
      `SELECT tc.priority,
        COUNT(DISTINCT tc.id) as total,
        COUNT(DISTINCT tr.test_case_id) as executed,
        SUM(CASE WHEN tr.result = 'Pass' THEN 1 ELSE 0 END) as passed
       FROM test_cases tc
       LEFT JOIN test_results tr ON tr.test_case_id = tc.id
       LEFT JOIN test_runs run ON tr.test_run_id = run.id AND run.workspace_id = $1
       WHERE tc.workspace_id = $1
       GROUP BY tc.priority
       ORDER BY CASE tc.priority WHEN 'Critical' THEN 1 WHEN 'P0' THEN 2 WHEN 'High' THEN 3 WHEN 'P1' THEN 4 WHEN 'Medium' THEN 5 WHEN 'P2' THEN 6 WHEN 'Low' THEN 7 WHEN 'P3' THEN 8 ELSE 9 END`, [workspaceId]
    );

    // 7. Flaky tests
    const flakyTestsQ = await safeQuery(pool,
      `SELECT tc.id, tc.title, tc.priority,
        SUM(CASE WHEN tr.result = 'Pass' THEN 1 ELSE 0 END) as pass_count,
        SUM(CASE WHEN tr.result = 'Fail' THEN 1 ELSE 0 END) as fail_count,
        COUNT(tr.id) as total_runs
       FROM test_cases tc
       JOIN test_results tr ON tr.test_case_id = tc.id
       JOIN test_runs run ON tr.test_run_id = run.id
       WHERE run.workspace_id = $1
       GROUP BY tc.id, tc.title, tc.priority
       HAVING SUM(CASE WHEN tr.result = 'Pass' THEN 1 ELSE 0 END) > 0
          AND SUM(CASE WHEN tr.result = 'Fail' THEN 1 ELSE 0 END) > 0
       ORDER BY (SUM(CASE WHEN tr.result = 'Fail' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(tr.id), 0)) DESC
       LIMIT 5`, [workspaceId]
    );

    // 8. Test debt
    const neverRunQ = await safeQuery(pool,
      `SELECT COUNT(*) as count FROM test_cases tc
       LEFT JOIN test_results tr ON tr.test_case_id = tc.id
       WHERE tc.workspace_id = $1 AND tr.id IS NULL`, [workspaceId]
    );
    const noExpectedQ = await safeQuery(pool,
      `SELECT COUNT(*) as count FROM test_cases WHERE workspace_id = $1 AND (expected_result IS NULL OR TRIM(expected_result) = '')`, [workspaceId]
    );
    const neverRun = parseInt(neverRunQ.rows[0].count || 0, 10);
    const noExpected = parseInt(noExpectedQ.rows[0].count || 0, 10);
    const debtScore = totalCases > 0 ? Math.max(0, 100 - Math.round(((neverRun * 2 + noExpected) / Math.max(totalCases * 2, 1)) * 100)) : 100;

    // 9. Milestone risk
    const milestonesQ = await safeQuery(pool,
      `SELECT m.id, m.name, m.due_date, m.status,
        COUNT(DISTINCT run.id) as linked_runs,
        SUM(CASE WHEN run.status != 'Completed' THEN 1 ELSE 0 END) as incomplete_runs,
        GREATEST(0, EXTRACT(DAY FROM (m.due_date::timestamp - NOW()))) as days_until_due
       FROM milestones m
       LEFT JOIN test_runs run ON run.milestone_id = m.id
       WHERE m.workspace_id = $1 AND m.due_date IS NOT NULL AND m.due_date::date >= CURRENT_DATE AND m.status != 'Closed'
       GROUP BY m.id, m.name, m.due_date, m.status
       ORDER BY m.due_date ASC
       LIMIT 5`, [workspaceId]
    );

    // 10. Velocity (last 14 days)
    const velocityQ = await safeQuery(pool,
      `SELECT DATE(COALESCE(tr.executed_at, tr.created_at)) as exec_date,
        COUNT(*) as executions,
        SUM(CASE WHEN tr.result = 'Pass' THEN 1 ELSE 0 END) as passed
       FROM test_results tr
       JOIN test_runs run ON tr.test_run_id = run.id
       WHERE run.workspace_id = $1 AND COALESCE(tr.executed_at, tr.created_at) >= NOW() - INTERVAL '14 days'
       GROUP BY DATE(COALESCE(tr.executed_at, tr.created_at))
       ORDER BY exec_date`, [workspaceId]
    );

    // 11. Trend (last 8 runs)
    const trendQ = await safeQuery(pool,
      `SELECT run.id, run.name, run.created_at,
        COUNT(tr.id) as total,
        SUM(CASE WHEN tr.result = 'Pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN tr.result = 'Fail' THEN 1 ELSE 0 END) as failed
       FROM test_runs run
       LEFT JOIN test_results tr ON tr.test_run_id = run.id
       WHERE run.workspace_id = $1
       GROUP BY run.id, run.name, run.created_at
       ORDER BY run.created_at DESC LIMIT 8`, [workspaceId]
    );

    // 12. Health by status
    const healthQ = await safeQuery(pool,
      `SELECT status, COUNT(*) as count FROM test_cases WHERE workspace_id = $1 GROUP BY status`, [workspaceId]
    );

    // 13. Top failing tests
    const topFailingQ = await safeQuery(pool,
      `SELECT tc.id, tc.title, tc.priority,
        COUNT(tr.id) as total_runs,
        SUM(CASE WHEN tr.result = 'Fail' THEN 1 ELSE 0 END) as fail_count
       FROM test_cases tc
       JOIN test_results tr ON tr.test_case_id = tc.id
       JOIN test_runs run ON tr.test_run_id = run.id
       WHERE run.workspace_id = $1
       GROUP BY tc.id, tc.title, tc.priority
       HAVING SUM(CASE WHEN tr.result = 'Fail' THEN 1 ELSE 0 END) > 0
       ORDER BY fail_count DESC LIMIT 5`, [workspaceId]
    );

    // ── 14. DEFECT COUNTS ────────────────────────────────────────────────────
    const defectsQ = await safeQuery(pool,
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'open') AS open_defects,
        COUNT(*) FILTER (WHERE severity = 'critical') AS critical_defects
       FROM defects WHERE workspace_id = $1`, [workspaceId]
    );
    const defectRow = defectsQ.rows[0];

    // ── 15. AUTOMATION COVERAGE — per workspace (all projects) ───────────────
    // Use JSONB containment @> to reliably match boolean true regardless of how it was stored
    const automationByProjectQ = await safeQuery(pool,
      `SELECT w.id, w.name,
        COUNT(tc.id) as total,
        SUM(CASE WHEN tc.field_values @> '{"is_automated":true}'::jsonb THEN 1 ELSE 0 END) as automated,
        SUM(CASE WHEN (tc.field_values->>'automation_type') IS NOT NULL AND (tc.field_values->>'automation_type') != '' AND (tc.field_values->>'automation_type') != 'None' THEN 1 ELSE 0 END) as has_automation_type
       FROM workspaces w
       LEFT JOIN test_cases tc ON tc.workspace_id = w.id
       GROUP BY w.id, w.name
       ORDER BY total DESC`
    );

    const automationTotalQ = await safeQuery(pool,
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN field_values @> '{"is_automated":true}'::jsonb THEN 1 ELSE 0 END) as automated,
        SUM(CASE WHEN (field_values->>'automation_type') IS NOT NULL AND (field_values->>'automation_type') != '' AND (field_values->>'automation_type') != 'None' THEN 1 ELSE 0 END) as has_type
       FROM test_cases WHERE workspace_id = $1`, [workspaceId]
    );

    const autoTotal = parseInt(automationTotalQ.rows[0].total || 0, 10);
    const autoCount = parseInt(automationTotalQ.rows[0].automated || 0, 10);
    const autoTyped = parseInt(automationTotalQ.rows[0].has_type || 0, 10);

    res.json({
      readiness: {
        score: readinessScore,
        coverage_pct: Math.round(coveragePct),
        pass_rate: overallPassRate,
        critical_pass_rate: criticalPassRate,
        total_cases: totalCases,
        executed_cases: executedCases,
        draft_count: draftCount,
        untested_count: totalCases - executedCases,
      },
      coverage_by_priority: coverageByPriorityQ.rows,
      flaky_tests: flakyTestsQ.rows,
      test_debt: {
        score: debtScore,
        never_run: neverRun,
        no_expected_result: noExpected,
        total: totalCases,
      },
      milestones: milestonesQ.rows,
      velocity: velocityQ.rows,
      trend: trendQ.rows.reverse(),
      health_by_status: healthQ.rows,
      top_failing: topFailingQ.rows,
      automation: {
        total: autoTotal,
        automated: autoCount,
        pending: autoTotal - autoCount,
        typed: autoTyped,
        pct: autoTotal > 0 ? Math.round((autoCount / autoTotal) * 100) : 0,
        by_project: automationByProjectQ.rows,
      },
      defects: {
        total:    parseInt(defectRow.total || 0, 10),
        open:     parseInt(defectRow.open_defects || 0, 10),
        critical: parseInt(defectRow.critical_defects || 0, 10),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAutomationStats = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN field_values @> '{"is_automated":true}'::jsonb THEN 1 ELSE 0 END) as automated
       FROM test_cases WHERE workspace_id = $1`,
      [workspaceId]
    );
    const total = parseInt(result.rows[0].total || 0, 10);
    const automated = parseInt(result.rows[0].automated || 0, 10);
    res.json({ total, automated, pending: total - automated, pct: total > 0 ? Math.round((automated / total) * 100) : 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getReportMetrics,
  getAuditLog,
  getTestCaseHistory,
  getTestCaseResults,
  getDashboardAnalytics,
  getAutomationStats
};
