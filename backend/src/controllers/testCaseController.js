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
    const result = await pool.query(
      `UPDATE test_cases SET title = $1, description = $2, steps = $3, expected_result = $4, priority = $5, field_values = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND workspace_id = $8 RETURNING *`,
      [title, description, JSON.stringify(steps), expected_result, priority, JSON.stringify(field_values || {}), id, workspaceId]
    );

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

    // Delete test case (versions cascade delete)
    await pool.query(
      'DELETE FROM test_cases WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

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

    // Create clone
    const result = await pool.query(
      `INSERT INTO test_cases (workspace_id, template_id, title, description, steps, expected_result, priority, field_values, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [workspaceId, tc.template_id, `${tc.title} (Copy)`, tc.description, tc.steps, tc.expected_result, tc.priority, tc.field_values || {}, userId]
    );

    res.status(201).json({ message: 'Test case cloned', testCase: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createTestCase, getTestCases, getTestCase, updateTestCase, deleteTestCase, cloneTestCase };
