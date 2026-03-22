const pool = require('../config/database');

// Helper: fetch workspace GitHub integration config
const getGitHubConfig = async (workspaceId) => {
  const result = await pool.query(
    "SELECT config FROM integrations WHERE workspace_id = $1 AND type = 'github' AND is_enabled = TRUE LIMIT 1",
    [workspaceId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].config; // { token, owner, repo }
};

const createDefect = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;
    const { title, description, severity, test_case_id, test_run_id, assignee_id, create_github_issue } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    let githubIssueNumber = null;
    let githubIssueUrl = null;
    let githubIssueState = null;

    if (create_github_issue) {
      const ghConfig = await getGitHubConfig(workspaceId);
      if (ghConfig && ghConfig.token && ghConfig.owner && ghConfig.repo) {
        const ghRes = await fetch(
          `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/issues`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ghConfig.token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github+json',
            },
            body: JSON.stringify({
              title,
              body: description || '',
              labels: ['bug', severity || 'medium'],
            }),
          }
        );
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          githubIssueNumber = ghData.number;
          githubIssueUrl = ghData.html_url;
          githubIssueState = ghData.state;
        }
      }
    }

    const result = await pool.query(
      `INSERT INTO defects
        (workspace_id, title, description, severity, status, test_case_id, test_run_id,
         reporter_id, assignee_id, github_issue_number, github_issue_url, github_issue_state)
       VALUES ($1,$2,$3,$4,'open',$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        workspaceId, title, description || null, severity || 'medium',
        test_case_id || null, test_run_id || null,
        userId, assignee_id || null,
        githubIssueNumber, githubIssueUrl, githubIssueState,
      ]
    );

    res.status(201).json({ message: 'Defect created', defect: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDefects = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const { test_case_id, test_run_id, status, severity } = req.query;

    const conditions = ['d.workspace_id = $1'];
    const params = [workspaceId];
    let idx = 2;

    if (test_case_id) { conditions.push(`d.test_case_id = $${idx++}`); params.push(test_case_id); }
    if (test_run_id)  { conditions.push(`d.test_run_id = $${idx++}`);  params.push(test_run_id); }
    if (status)       { conditions.push(`d.status = $${idx++}`);       params.push(status); }
    if (severity)     { conditions.push(`d.severity = $${idx++}`);     params.push(severity); }

    const result = await pool.query(
      `SELECT d.*,
        r.name  AS reporter_name,
        a.name  AS assignee_name,
        tc.title AS test_case_title,
        tr.name  AS test_run_name
       FROM defects d
       LEFT JOIN users r  ON d.reporter_id  = r.id
       LEFT JOIN users a  ON d.assignee_id  = a.id
       LEFT JOIN test_cases tc ON d.test_case_id = tc.id
       LEFT JOIN test_runs  tr ON d.test_run_id  = tr.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDefect = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      `SELECT d.*,
        r.name  AS reporter_name,
        a.name  AS assignee_name,
        tc.title AS test_case_title,
        tr.name  AS test_run_name
       FROM defects d
       LEFT JOIN users r  ON d.reporter_id  = r.id
       LEFT JOIN users a  ON d.assignee_id  = a.id
       LEFT JOIN test_cases tc ON d.test_case_id = tc.id
       LEFT JOIN test_runs  tr ON d.test_run_id  = tr.id
       WHERE d.id = $1 AND d.workspace_id = $2`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Defect not found' });

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateDefect = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    const { title, description, severity, status, assignee_id } = req.body;

    const result = await pool.query(
      `UPDATE defects
       SET title       = COALESCE($1, title),
           description = COALESCE($2, description),
           severity    = COALESCE($3, severity),
           status      = COALESCE($4, status),
           assignee_id = COALESCE($5, assignee_id),
           updated_at  = CURRENT_TIMESTAMP
       WHERE id = $6 AND workspace_id = $7
       RETURNING *`,
      [title || null, description || null, severity || null, status || null, assignee_id || null, id, workspaceId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Defect not found' });

    res.json({ message: 'Defect updated', defect: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteDefect = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      'DELETE FROM defects WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [id, workspaceId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Defect not found' });

    res.json({ message: 'Defect deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const syncGitHub = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;

    const defectResult = await pool.query(
      'SELECT * FROM defects WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (defectResult.rows.length === 0) return res.status(404).json({ error: 'Defect not found' });

    const defect = defectResult.rows[0];

    if (!defect.github_issue_number) {
      return res.status(400).json({ error: 'No GitHub issue linked to this defect' });
    }

    const ghConfig = await getGitHubConfig(workspaceId);
    if (!ghConfig || !ghConfig.token || !ghConfig.owner || !ghConfig.repo) {
      return res.status(400).json({ error: 'GitHub integration not configured' });
    }

    const ghRes = await fetch(
      `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/issues/${defect.github_issue_number}`,
      {
        headers: {
          'Authorization': `Bearer ${ghConfig.token}`,
          'Accept': 'application/vnd.github+json',
        },
      }
    );

    if (!ghRes.ok) {
      const errData = await ghRes.json();
      return res.status(ghRes.status).json({ error: errData.message || 'GitHub API error' });
    }

    const ghData = await ghRes.json();

    const updated = await pool.query(
      `UPDATE defects SET github_issue_state = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [ghData.state, id]
    );

    res.json({ message: 'GitHub issue synced', defect: updated.rows[0], github_state: ghData.state });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDefectStats = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'open')        AS open,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved')    AS resolved,
        COUNT(*) FILTER (WHERE status = 'closed')      AS closed,
        COUNT(*) FILTER (WHERE severity = 'critical')  AS critical,
        COUNT(*) FILTER (WHERE severity = 'high')      AS high,
        COUNT(*) FILTER (WHERE severity = 'medium')    AS medium,
        COUNT(*) FILTER (WHERE severity = 'low')       AS low
       FROM defects WHERE workspace_id = $1`,
      [workspaceId]
    );

    const row = result.rows[0];

    res.json({
      total:       parseInt(row.total, 10),
      open:        parseInt(row.open, 10),
      in_progress: parseInt(row.in_progress, 10),
      resolved:    parseInt(row.resolved, 10),
      closed:      parseInt(row.closed, 10),
      by_severity: {
        critical: parseInt(row.critical, 10),
        high:     parseInt(row.high, 10),
        medium:   parseInt(row.medium, 10),
        low:      parseInt(row.low, 10),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper: fetch workspace Jira integration config
const getJiraConfig = async (workspaceId) => {
  const result = await pool.query(
    "SELECT config FROM integrations WHERE workspace_id = $1 AND type = 'jira' AND is_enabled = TRUE LIMIT 1",
    [workspaceId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].config; // { domain, email, api_token, project_key, default_epic }
};

const raiseJira = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user.workspace_id;
    const { summary, description, priority = 'High', epic_key, issue_type = 'Bug' } = req.body;

    // Verify defect belongs to workspace
    const defectResult = await pool.query(
      'SELECT * FROM defects WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );
    if (defectResult.rows.length === 0) return res.status(404).json({ error: 'Defect not found' });

    const jiraConfig = await getJiraConfig(workspaceId);
    if (!jiraConfig || !jiraConfig.domain || !jiraConfig.email || !jiraConfig.api_token || !jiraConfig.project_key) {
      return res.status(400).json({ error: 'Jira integration not configured. Go to Settings → Integrations → Jira.' });
    }

    const { domain, email, api_token, project_key, default_epic } = jiraConfig;
    const epicToUse = epic_key || default_epic || null;

    const issueTitle = summary || defectResult.rows[0].title;
    const issueDesc = description || defectResult.rows[0].description || '';

    // Build Jira issue body (ADF format for description)
    const issueBody = {
      fields: {
        project: { key: project_key },
        summary: issueTitle,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: issueDesc }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: `\nFlywl Defect ID: DEF-${id}` }],
            },
          ],
        },
        issuetype: { name: issue_type },
        priority: { name: priority },
      },
    };

    // Link to EPIC — try both next-gen (parent) and classic (customfield_10014)
    if (epicToUse) {
      issueBody.fields.parent = { key: epicToUse };
      issueBody.fields.customfield_10014 = epicToUse;
    }

    const authHeader = 'Basic ' + Buffer.from(`${email}:${api_token}`).toString('base64');

    const jiraRes = await fetch(`https://${domain}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(issueBody),
    });

    const jiraData = await jiraRes.json();

    if (!jiraRes.ok) {
      const errMsg = jiraData.errorMessages?.[0] || JSON.stringify(jiraData.errors) || 'Jira API error';
      return res.status(jiraRes.status).json({ error: errMsg });
    }

    const jiraKey = jiraData.key;
    const jiraUrl = `https://${domain}/browse/${jiraKey}`;

    // Persist Jira link on the defect
    const updated = await pool.query(
      `UPDATE defects SET jira_issue_key = $1, jira_issue_url = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [jiraKey, jiraUrl, id]
    );

    res.json({ message: 'Jira issue created', jira_key: jiraKey, jira_url: jiraUrl, defect: updated.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createDefect,
  getDefects,
  getDefect,
  updateDefect,
  deleteDefect,
  syncGitHub,
  raiseJira,
  getDefectStats,
};
