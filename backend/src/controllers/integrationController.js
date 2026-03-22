const pool = require('../config/database');
const crypto = require('crypto');

// Mask sensitive fields in config before returning to client
const maskConfig = (type, config) => {
  const masked = { ...config };
  if (type === 'github' && masked.token) masked.token = '***';
  if (type === 'slack' && masked.webhook_url) masked.webhook_url = masked.webhook_url.replace(/\/[^/]+$/, '/***');
  if (type === 'github_actions' && masked.secret) masked.secret = '***';
  return masked;
};

const getIntegrations = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      'SELECT * FROM integrations WHERE workspace_id = $1 ORDER BY created_at DESC',
      [workspaceId]
    );

    const integrations = result.rows.map((row) => ({
      ...row,
      config: maskConfig(row.type, row.config),
      webhook_token: row.webhook_token ? '***' : null,
    }));

    res.json(integrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createIntegration = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const { type, name, config } = req.body;

    if (!type) return res.status(400).json({ error: 'type is required' });
    if (!config) return res.status(400).json({ error: 'config is required' });

    const webhookToken = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO integrations (workspace_id, type, name, config, webhook_token)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [workspaceId, type, name || type, JSON.stringify(config), webhookToken]
    );

    const integration = result.rows[0];
    res.status(201).json({
      message: 'Integration created',
      integration: {
        ...integration,
        config: maskConfig(integration.type, integration.config),
        webhook_token: integration.webhook_token, // return real token once on creation
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateIntegration = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    const { name, config, is_enabled } = req.body;

    // Get existing integration to merge config
    const existing = await pool.query(
      'SELECT * FROM integrations WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (existing.rows.length === 0) return res.status(404).json({ error: 'Integration not found' });

    const currentConfig = existing.rows[0].config;
    const newConfig = config ? { ...currentConfig, ...config } : currentConfig;

    // Don't overwrite token with *** if the caller sent masked value
    if (config && config.token === '***') newConfig.token = currentConfig.token;
    if (config && config.secret === '***') newConfig.secret = currentConfig.secret;

    const result = await pool.query(
      `UPDATE integrations
       SET name       = COALESCE($1, name),
           config     = $2,
           is_enabled = COALESCE($3, is_enabled),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND workspace_id = $5
       RETURNING *`,
      [name || null, JSON.stringify(newConfig), is_enabled !== undefined ? is_enabled : null, id, workspaceId]
    );

    res.json({
      message: 'Integration updated',
      integration: {
        ...result.rows[0],
        config: maskConfig(result.rows[0].type, result.rows[0].config),
        webhook_token: '***',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteIntegration = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      'DELETE FROM integrations WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [id, workspaceId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Integration not found' });

    res.json({ message: 'Integration deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const testIntegration = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      'SELECT * FROM integrations WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Integration not found' });

    const integration = result.rows[0];
    const config = integration.config;

    if (integration.type === 'github') {
      if (!config.token || !config.owner || !config.repo) {
        return res.status(400).json({ error: 'GitHub integration missing token, owner, or repo' });
      }

      const ghRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}`,
        {
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Accept': 'application/vnd.github+json',
          },
        }
      );

      if (!ghRes.ok) {
        const errData = await ghRes.json();
        return res.status(ghRes.status).json({ success: false, error: errData.message || 'GitHub API error' });
      }

      const ghData = await ghRes.json();
      return res.json({
        success: true,
        repo_name: ghData.full_name,
        stars: ghData.stargazers_count,
        private: ghData.private,
      });
    }

    if (integration.type === 'slack') {
      if (!config.webhook_url) {
        return res.status(400).json({ error: 'Slack integration missing webhook_url' });
      }

      const slackRes = await fetch(config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '✅ Flywl test notification — Slack integration connected!' }),
      });

      if (!slackRes.ok) {
        return res.status(slackRes.status).json({ success: false, error: 'Slack webhook call failed' });
      }

      return res.json({ success: true, message: 'Slack notification sent successfully' });
    }

    if (integration.type === 'github_actions') {
      // Provide the webhook URL for use in CI/CD
      const webhookUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/integrations/webhook/${integration.webhook_token}`;
      return res.json({
        success: true,
        webhook_url: webhookUrl,
        instructions: 'Add this URL as a webhook in your GitHub Actions workflow to trigger test runs.',
      });
    }

    return res.status(400).json({ error: `Unknown integration type: ${integration.type}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// No auth required — called by external CI/CD systems
const receiveWebhook = async (req, res) => {
  try {
    const { token } = req.params;

    const intResult = await pool.query(
      "SELECT * FROM integrations WHERE webhook_token = $1 AND is_enabled = TRUE",
      [token]
    );

    if (intResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid webhook token' });
    }

    const integration = intResult.rows[0];
    const payload = req.body;

    // If payload has run_name and test_case_ids, create a test run
    if (payload.run_name && Array.isArray(payload.test_case_ids) && payload.test_case_ids.length > 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const runResult = await client.query(
          `INSERT INTO test_runs (workspace_id, name, description, status)
           VALUES ($1,$2,$3,'In Progress')
           RETURNING *`,
          [
            integration.workspace_id,
            payload.run_name,
            payload.description || `Triggered via ${integration.name || 'CI/CD webhook'}`,
          ]
        );

        const run = runResult.rows[0];

        // Insert test results for each test case
        for (const tcId of payload.test_case_ids) {
          await client.query(
            `INSERT INTO test_results (test_run_id, test_case_id, status)
             VALUES ($1,$2,'Not Started')`,
            [run.id, tcId]
          );
        }

        await client.query('COMMIT');

        return res.json({ success: true, run_id: run.id, message: 'Test run created via webhook' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // Generic webhook received
    res.json({ success: true, message: 'Webhook received', integration_id: integration.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Internal helper — notify Slack for a workspace
const notifySlack = async (workspaceId, message) => {
  try {
    const result = await pool.query(
      "SELECT config FROM integrations WHERE workspace_id = $1 AND type = 'slack' AND is_enabled = TRUE LIMIT 1",
      [workspaceId]
    );

    if (result.rows.length === 0) return;

    const config = result.rows[0].config;
    if (!config.webhook_url) return;

    await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (err) {
    console.error('Slack notification failed:', err.message);
  }
};

module.exports = {
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  receiveWebhook,
  notifySlack,
};
