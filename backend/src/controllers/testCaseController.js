const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const createTestCase = async (req, res) => {
  try {
    const { template_id, title, description, steps, expected_result, priority, field_values } = req.body;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO test_cases (workspace_id, template_id, title, description, steps, expected_result, priority, field_values, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [workspaceId, template_id, title, description, JSON.stringify(steps), expected_result, priority, JSON.stringify(field_values || {}), userId]
    );

    const testCase = result.rows[0];

    // Create version 1
    await pool.query(
      `INSERT INTO test_case_versions (test_case_id, version_number, title, description, steps, expected_result, priority, field_values, changed_by, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [testCase.id, 1, title, description, JSON.stringify(steps), expected_result, priority, JSON.stringify(field_values || {}), userId, 'Initial version']
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (workspace_id, user_id, action, entity_type, entity_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [workspaceId, userId, 'CREATE', 'TEST_CASE', testCase.id, JSON.stringify(testCase)]
    );

    res.status(201).json({ message: 'Test case created', testCase });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTestCases = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const result = await pool.query(
      'SELECT * FROM test_cases WHERE workspace_id = $1 ORDER BY created_at DESC',
      [workspaceId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      'SELECT * FROM test_cases WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    // Get version history
    const versionResult = await pool.query(
      'SELECT * FROM test_case_versions WHERE test_case_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      ...result.rows[0],
      versions: versionResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, steps, expected_result, priority, field_values, change_reason } = req.body;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;

    // Get old values
    const oldResult = await pool.query('SELECT * FROM test_cases WHERE id = $1', [id]);
    const oldValue = oldResult.rows[0];

    // Get current version number
    const versionResult = await pool.query(
      'SELECT MAX(version_number) as max_version FROM test_case_versions WHERE test_case_id = $1',
      [id]
    );
    const nextVersion = (versionResult.rows[0].max_version || 0) + 1;

    // Update test case
    // FIX BUG-11: include status in update so users can change test case status via edit dialog
    const { status } = req.body;
    const result = await pool.query(
      `UPDATE test_cases SET title = $1, description = $2, steps = $3, expected_result = $4, priority = $5, field_values = $6,
       status = COALESCE($7, status), updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND workspace_id = $9 RETURNING *`,
      [title, description, JSON.stringify(steps), expected_result, priority, JSON.stringify(field_values || {}), status || null, id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found or not in current workspace' });
    }

    // Create new version
    await pool.query(
      `INSERT INTO test_case_versions (test_case_id, version_number, title, description, steps, expected_result, priority, field_values, changed_by, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, nextVersion, title, description, JSON.stringify(steps), expected_result, priority, JSON.stringify(field_values || {}), userId, change_reason || 'Updated']
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (workspace_id, user_id, action, entity_type, entity_id, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [workspaceId, userId, 'UPDATE', 'TEST_CASE', id, JSON.stringify(oldValue), JSON.stringify(result.rows[0])]
    );

    res.json({ message: 'Test case updated', testCase: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;

    // Log deletion
    const oldResult = await pool.query('SELECT * FROM test_cases WHERE id = $1', [id]);
    await pool.query(
      `INSERT INTO audit_log (workspace_id, user_id, action, entity_type, entity_id, old_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [workspaceId, userId, 'DELETE', 'TEST_CASE', id, JSON.stringify(oldResult.rows[0])]
    );

    // Delete dependents first, then the test case
    await pool.query('DELETE FROM test_results WHERE test_case_id = $1', [id]);
    await pool.query('DELETE FROM test_case_versions WHERE test_case_id = $1', [id]);
    const deleteResult = await pool.query(
      'DELETE FROM test_cases WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [id, workspaceId]
    );

    // FIX BUG-05: return 404 when nothing was actually deleted
    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Test case not found in current workspace' });
    }

    res.json({ message: 'Test case deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const cloneTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;

    // Get original test case
    const original = await pool.query(
      'SELECT * FROM test_cases WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    const tc = original.rows[0];

    // FIX BUG-03 & BUG-04: use JSON.stringify for JSONB columns; add version history entry
    const cloneResult = await pool.query(
      `INSERT INTO test_cases (workspace_id, template_id, title, description, steps, expected_result, priority, field_values, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [workspaceId, tc.template_id, `${tc.title} (Copy)`, tc.description,
       JSON.stringify(tc.steps), tc.expected_result, tc.priority,
       JSON.stringify(tc.field_values || {}), userId]
    );

    const cloned = cloneResult.rows[0];

    // Create version 1 for the clone
    await pool.query(
      `INSERT INTO test_case_versions (test_case_id, version_number, title, description, steps, expected_result, priority, field_values, changed_by, change_reason)
       VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, 'Cloned from TC-' || $9)`,
      [cloned.id, cloned.title, cloned.description, JSON.stringify(tc.steps),
       cloned.expected_result, cloned.priority, JSON.stringify(tc.field_values || {}), userId, tc.id]
    );

    res.status(201).json({ message: 'Test case cloned', testCase: cloned });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── BULK DELETE ──────────────────────────────────────────────────────────────
const bulkDeleteTestCases = async (req, res) => {
  const client = await pool.connect();
  try {
    const { ids } = req.body;
    const workspaceId = req.user.workspace_id;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'No IDs provided' });

    // Verify all IDs belong to this workspace
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');

    await client.query('BEGIN');

    // FIX BUG-02: scope dependent deletes to workspace to prevent cross-workspace data deletion
    const idPlaceholders = ids.map((_, i) => `$${i + 2}`).join(',');
    const safeIds = [workspaceId, ...ids];

    await client.query(
      `DELETE FROM test_results WHERE test_case_id IN (
         SELECT id FROM test_cases WHERE workspace_id = $1 AND id IN (${idPlaceholders})
       )`, safeIds
    );
    await client.query(
      `DELETE FROM test_case_versions WHERE test_case_id IN (
         SELECT id FROM test_cases WHERE workspace_id = $1 AND id IN (${idPlaceholders})
       )`, safeIds
    );

    // Now delete the test cases (scoped to workspace)
    const result = await client.query(
      `DELETE FROM test_cases WHERE id IN (${placeholders}) AND workspace_id = $1 RETURNING id`,
      [workspaceId, ...ids]
    );

    await client.query('COMMIT');
    res.json({ message: `${result.rowCount} test cases deleted` });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ── BULK UPDATE (priority / status / template) ───────────────────────────────
const bulkUpdateTestCases = async (req, res) => {
  try {
    const { ids, updates } = req.body; // updates: { priority?, status?, template_id? }
    const workspaceId = req.user.workspace_id;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'No IDs provided' });

    const setClauses = [];
    const values = [workspaceId];
    let idx = 2;

    if (updates.priority)    { setClauses.push(`priority = $${idx++}`);    values.push(updates.priority); }
    if (updates.status)      { setClauses.push(`status = $${idx++}`);      values.push(updates.status); }
    if (updates.template_id !== undefined) { setClauses.push(`template_id = $${idx++}`); values.push(updates.template_id || null); }

    if (setClauses.length === 0)
      return res.status(400).json({ error: 'Nothing to update' });

    const placeholders = ids.map((_, i) => `$${idx + i}`).join(',');
    values.push(...ids);

    await pool.query(
      `UPDATE test_cases SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE workspace_id = $1 AND id IN (${placeholders})`,
      values
    );
    res.json({ message: `${ids.length} test cases updated` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── BULK MOVE (change workspace) ─────────────────────────────────────────────
const bulkMoveTestCases = async (req, res) => {
  try {
    const { ids, target_workspace_id } = req.body;
    const workspaceId = req.user.workspace_id;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'No IDs provided' });
    if (!target_workspace_id)
      return res.status(400).json({ error: 'target_workspace_id required' });

    const placeholders = ids.map((_, i) => `$${i + 3}`).join(',');
    await pool.query(
      `UPDATE test_cases SET workspace_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE workspace_id = $1 AND id IN (${placeholders})`,
      [workspaceId, target_workspace_id, ...ids]
    );
    res.json({ message: `${ids.length} test cases moved` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createTestCase, getTestCases, getTestCase, updateTestCase, deleteTestCase, cloneTestCase,
  bulkDeleteTestCases, bulkUpdateTestCases, bulkMoveTestCases
};
