const express = require('express');
const Groq = require('groq-sdk');
const { authenticateToken } = require('../middleware/auth');
const dbPool = require('../config/database');

const router = express.Router();

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function callGroq(prompt, maxTokens = 2048) {
  const client = getGroq();
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content || '';
}

function parseJSON(text) {
  const raw = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(raw);
}

// POST /api/ai/enrich — improve existing test case fields
router.post('/enrich', authenticateToken, async (req, res) => {
  try {
    const { title, description, steps, expected_result, preconditions } = req.body;
    if (!title && !description && !steps && !expected_result) {
      return res.status(400).json({ error: 'At least one field is required for enrichment.' });
    }

    const prompt = `You are a professional QA engineer. Rewrite the following test case fields in clear, professional QA English. Keep the technical meaning intact but improve grammar, clarity, and completeness. Format steps as a numbered list if there are multiple steps.

Input test case:
Title: ${title || '(not provided)'}
Preconditions: ${preconditions || '(not provided)'}
Description: ${description || '(not provided)'}
Steps: ${Array.isArray(steps) ? steps.join('\n') : (steps || '(not provided)')}
Expected Result: ${expected_result || '(not provided)'}

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "title": "...",
  "preconditions": "...",
  "description": "...",
  "steps": ["step 1", "step 2", "step 3"],
  "expected_result": "..."
}`;

    const text = await callGroq(prompt);
    const enriched = parseJSON(text);
    res.json({ enriched });
  } catch (error) {
    console.error('AI enrich error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/generate — generate test cases from feature description
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { feature_description, test_type = 'functional', count = 5, context = '' } = req.body;
    if (!feature_description) {
      return res.status(400).json({ error: 'feature_description is required.' });
    }

    const prompt = `You are a senior QA engineer. Generate exactly ${count} professional ${test_type} test cases for the following feature.

Feature Description:
${feature_description}
${context ? `\nAdditional Context:\n${context}` : ''}

Requirements:
- Cover both happy path and edge cases
- Include boundary conditions, error scenarios, and negative tests
- Each test case should be specific and actionable
- Steps should be clear enough for any QA engineer to follow

Respond ONLY with a valid JSON array (no markdown, no extra text):
[
  {
    "title": "Descriptive test case title",
    "description": "Brief description of what this test verifies",
    "preconditions": "What must be true before executing this test",
    "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
    "expected_result": "What should happen",
    "priority": "High|Medium|Low",
    "type": "Functional|Negative|Boundary|Integration"
  }
]`;

    const text = await callGroq(prompt, 4096);
    const testCases = parseJSON(text);
    res.json({ test_cases: Array.isArray(testCases) ? testCases : [testCases] });
  } catch (error) {
    console.error('AI generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/suggest-tags — suggest labels/tags for a test case
router.post('/suggest-tags', authenticateToken, async (req, res) => {
  try {
    const { title, description, steps, expected_result } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required.' });

    const prompt = `You are a QA engineer. Based on the test case details below, suggest 3-6 relevant tags/labels that would help categorize and filter this test case.

Test Case:
Title: ${title}
Description: ${description || ''}
Steps: ${Array.isArray(steps) ? steps.join(', ') : (steps || '')}
Expected Result: ${expected_result || ''}

Suggest tags from categories like: feature area (login, checkout, search), type (smoke, regression, sanity, e2e), browser (chrome, firefox, safari), platform (mobile, desktop, api), criticality (critical, high-priority, blocker).

Respond ONLY with a valid JSON object (no markdown, no extra text):
{
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "reasoning": "Brief explanation of why these tags were chosen"
}`;

    const text = await callGroq(prompt, 512);
    const result = parseJSON(text);
    res.json(result);
  } catch (error) {
    console.error('AI suggest-tags error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/detect-duplicates — find similar test cases
router.post('/detect-duplicates', authenticateToken, async (req, res) => {
  try {
    const { title, description = '', id } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required.' });

    const workspace_id = req.user.workspace_id;
    const { rows: existing } = await dbPool.query(
      `SELECT id, title, description FROM test_cases
       WHERE workspace_id = $1 ${id ? 'AND id != $2' : ''}
       ORDER BY id DESC LIMIT 100`,
      id ? [workspace_id, id] : [workspace_id]
    );

    if (existing.length === 0) return res.json({ duplicates: [] });

    const listText = existing.map(tc =>
      `ID:${tc.id} | "${tc.title}" | ${(tc.description || '').substring(0, 80)}`
    ).join('\n');

    const prompt = `You are a QA engineer reviewing test cases for duplicates or near-duplicates.

New test case:
Title: "${title}"
Description: "${description}"

Existing test cases (ID | Title | Short Description):
${listText}

Find test cases that are duplicates or very similar to the new one (same functionality being tested, even if worded differently). Only include strong matches (similarity > 70%).

Respond ONLY with a valid JSON object (no markdown, no extra text):
{
  "duplicates": [
    {"id": 123, "title": "...", "similarity": 85, "reason": "Tests the same login validation flow"}
  ]
}`;

    const text = await callGroq(prompt, 1024);
    const result = parseJSON(text);
    res.json(result);
  } catch (error) {
    console.error('AI detect-duplicates error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/risk-scores — calculate risk scores for test cases based on history
router.get('/risk-scores', authenticateToken, async (req, res) => {
  try {
    const workspace_id = req.user.workspace_id;

    // Get test cases with their failure history
    const { rows } = await dbPool.query(`
      SELECT
        tc.id,
        tc.title,
        tc.priority,
        COUNT(tr.id) AS total_runs,
        SUM(CASE WHEN tr.result_status = 'Fail' THEN 1 ELSE 0 END) AS fail_count,
        SUM(CASE WHEN tr.result_status = 'Pass' THEN 1 ELSE 0 END) AS pass_count,
        MAX(tr.updated_at) AS last_run,
        array_length(
          COALESCE(
            (SELECT steps FROM test_cases tc2 WHERE tc2.id = tc.id),
            ARRAY[]::text[]
          ), 1
        ) AS step_count
      FROM test_cases tc
      LEFT JOIN test_results tr ON tr.test_case_id = tc.id
      WHERE tc.workspace_id = $1
      GROUP BY tc.id, tc.title, tc.priority
      ORDER BY tc.id
    `, [workspace_id]);

    const now = Date.now();
    const scored = rows.map(tc => {
      const totalRuns = parseInt(tc.total_runs) || 0;
      const failCount = parseInt(tc.fail_count) || 0;
      const passCount = parseInt(tc.pass_count) || 0;
      const stepCount = parseInt(tc.step_count) || 1;

      // Risk factors (each 0-100)
      const failureRate = totalRuns > 0 ? (failCount / totalRuns) * 100 : 0;

      // Staleness: days since last run (max 30 days contribution)
      const daysSinceRun = tc.last_run
        ? Math.min((now - new Date(tc.last_run).getTime()) / (1000 * 86400), 30)
        : 30;
      const stalenessScore = (daysSinceRun / 30) * 40;

      // Priority weight
      const priorityWeight = { 'Critical': 30, 'High': 20, 'Medium': 10, 'Low': 5 }[tc.priority] || 10;

      // Complexity (based on step count)
      const complexityScore = Math.min(stepCount * 3, 20);

      // Never run = high risk
      const neverRunPenalty = totalRuns === 0 ? 20 : 0;

      const riskScore = Math.round(
        (failureRate * 0.35) +
        (stalenessScore * 0.25) +
        (priorityWeight * 1.0) +
        (complexityScore * 0.5) +
        neverRunPenalty
      );

      const clampedScore = Math.min(riskScore, 100);

      return {
        id: tc.id,
        title: tc.title,
        priority: tc.priority,
        risk_score: clampedScore,
        risk_level: clampedScore >= 70 ? 'High' : clampedScore >= 40 ? 'Medium' : 'Low',
        factors: {
          failure_rate: Math.round(failureRate),
          total_runs: totalRuns,
          fail_count: failCount,
          pass_count: passCount,
          days_since_run: Math.round(daysSinceRun),
          step_count: stepCount
        }
      };
    });

    // Sort by risk score descending
    scored.sort((a, b) => b.risk_score - a.risk_score);
    res.json({ risk_scores: scored });
  } catch (error) {
    console.error('AI risk-scores error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/predict-flaky — predict which tests are likely flaky
router.get('/predict-flaky', authenticateToken, async (req, res) => {
  try {
    const workspace_id = req.user.workspace_id;

    const { rows } = await dbPool.query(`
      SELECT
        tc.id,
        tc.title,
        tc.priority,
        COUNT(tr.id) AS total_runs,
        SUM(CASE WHEN tr.result_status = 'Fail' THEN 1 ELSE 0 END) AS fail_count,
        SUM(CASE WHEN tr.result_status = 'Pass' THEN 1 ELSE 0 END) AS pass_count,
        -- Count alternating pass/fail patterns (flakiness indicator)
        COUNT(DISTINCT run_seq.run_id) AS distinct_runs
      FROM test_cases tc
      LEFT JOIN test_results tr ON tr.test_case_id = tc.id
      LEFT JOIN (
        SELECT DISTINCT test_run_id AS run_id, test_case_id FROM test_results
      ) run_seq ON run_seq.test_case_id = tc.id
      WHERE tc.workspace_id = $1
      GROUP BY tc.id, tc.title, tc.priority
      HAVING COUNT(tr.id) >= 3
      ORDER BY tc.id
    `, [workspace_id]);

    const flaky = rows
      .map(tc => {
        const totalRuns = parseInt(tc.total_runs) || 0;
        const failCount = parseInt(tc.fail_count) || 0;
        const passCount = parseInt(tc.pass_count) || 0;

        if (totalRuns < 3) return null;

        // Flakiness: tests that sometimes pass, sometimes fail (not consistently either)
        const failRate = failCount / totalRuns;
        // A test with 20-80% failure rate is most likely flaky
        const flakinesScore = failRate > 0.1 && failRate < 0.9
          ? Math.round((1 - Math.abs(failRate - 0.5) * 2) * 100)
          : 0;

        if (flakinesScore < 30) return null;

        return {
          id: tc.id,
          title: tc.title,
          priority: tc.priority,
          flakiness_score: flakinesScore,
          total_runs: totalRuns,
          fail_count: failCount,
          pass_count: passCount,
          fail_rate: Math.round(failRate * 100)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.flakiness_score - a.flakiness_score)
      .slice(0, 20);

    res.json({ flaky_tests: flaky });
  } catch (error) {
    console.error('AI predict-flaky error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
