const express = require('express');
const Groq = require('groq-sdk');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/enrich', authenticateToken, async (req, res) => {
  try {
    const { title, description, steps, expected_result, preconditions } = req.body;

    if (!title && !description && !steps && !expected_result) {
      return res.status(400).json({ error: 'At least one field is required for enrichment.' });
    }

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content || '';

    let enriched;
    try {
      const raw = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      enriched = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse AI response.', raw: text });
    }

    res.json({ enriched });
  } catch (error) {
    console.error('AI enrich error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
