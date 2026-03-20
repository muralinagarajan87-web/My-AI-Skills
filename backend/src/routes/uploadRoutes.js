const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const XLSX = require('xlsx');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create uploads directory if not exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('Unsupported file type. Please upload CSV or Excel files.'));
    }
    cb(null, true);
  },
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }
});

// Download test cases as Excel
router.get('/download/excel', authenticateToken, async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      `SELECT tc.id, tc.title, tc.description, tc.steps, tc.expected_result, tc.priority, tc.status, tc.created_at
       FROM test_cases tc
       WHERE tc.workspace_id = $1
       ORDER BY tc.created_at DESC`,
      [workspaceId]
    );

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(result.rows.map(row => ({
      'ID': row.id,
      'Title': row.title,
      'Description': row.description,
      'Steps': typeof row.steps === 'object' ? JSON.stringify(row.steps) : row.steps,
      'Expected Result': row.expected_result,
      'Priority': row.priority,
      'Status': row.status,
      'Created At': row.created_at
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');

    // Send file
    const filename = `test-cases-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download test cases as CSV
router.get('/download/csv', authenticateToken, async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;

    const result = await pool.query(
      `SELECT tc.id, tc.title, tc.description, tc.steps, tc.expected_result, tc.priority, tc.status, tc.created_at
       FROM test_cases tc
       WHERE tc.workspace_id = $1
       ORDER BY tc.created_at DESC`,
      [workspaceId]
    );

    // Create CSV
    const headers = ['ID', 'Title', 'Description', 'Steps', 'Expected Result', 'Priority', 'Status', 'Created At'];
    const rows = result.rows.map(row => [
      row.id,
      `"${row.title}"`,
      `"${row.description || ''}"`,
      `"${typeof row.steps === 'object' ? JSON.stringify(row.steps) : row.steps}"`,
      `"${row.expected_result || ''}"`,
      row.priority,
      row.status,
      row.created_at
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="test-cases-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { parse } = require('csv-parse/sync');

// ── PREVIEW: parse file headers + sample rows, keep on disk for import ──
router.post('/preview', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    let headers = [];
    let sample = [];
    let totalRows = 0;

    if (ext === '.csv') {
      const csvData = fs.readFileSync(req.file.path, 'utf8');
      const records = parse(csvData, { columns: true, skip_empty_lines: true, trim: true });
      totalRows = records.length;
      if (records.length > 0) {
        headers = Object.keys(records[0]);
        sample = records.slice(0, 5);
      }
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      totalRows = data.length;
      if (data.length > 0) {
        headers = Object.keys(data[0]);
        sample = data.slice(0, 5);
      }
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Unsupported file format. Use CSV or XLSX.' });
    }

    const tempId = path.basename(req.file.path);
    const tempExt = ext;

    res.json({ tempId, tempExt, headers, sample, totalRows });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── IMPORT: use column mapping to insert test cases ──
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const { tempId, tempExt, mapping, template_id } = req.body;
    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;

    if (!mapping || !mapping.title) {
      return res.status(400).json({ error: 'Title mapping is required.' });
    }

    const filePath = path.join(uploadDir, tempId);
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'Upload session expired. Please upload the file again.' });
    }

    const getMapped = (row, colName, fallback = '') => {
      if (!colName) return fallback;
      const val = row[colName];
      return val !== undefined && val !== null ? String(val).trim() : fallback;
    };

    const normalizeSteps = (raw) => {
      if (!raw) return [];
      const trimmed = raw.trim();
      if (!trimmed) return [];
      try { const p = JSON.parse(trimmed); if (Array.isArray(p)) return p; } catch (e) {}
      return trimmed.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    };

    let rows = [];
    if (tempExt === '.csv') {
      const csvData = fs.readFileSync(filePath, 'utf8');
      rows = parse(csvData, { columns: true, skip_empty_lines: true, trim: true });
    } else {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }

    const inserted = [];
    for (const row of rows) {
      const title = getMapped(row, mapping.title, '').trim();
      if (!title) continue; // skip rows without a title

      const fieldVals = {};
      ['section', 'type', 'assigned_to', 'estimate', 'automation_type',
       'is_automated', 'automation_candidate', 'references', 'preconditions'].forEach(f => {
        if (mapping[f]) fieldVals[f] = getMapped(row, mapping[f]);
      });

      const result = await pool.query(
        `INSERT INTO test_cases (workspace_id, template_id, title, description, steps, expected_result, priority, status, field_values, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [
          workspaceId,
          template_id || null,
          title,
          getMapped(row, mapping.description),
          JSON.stringify(normalizeSteps(getMapped(row, mapping.steps))),
          getMapped(row, mapping.expected_result),
          getMapped(row, mapping.priority, 'Medium'),
          getMapped(row, mapping.status, 'Draft'),
          JSON.stringify(fieldVals),
          userId
        ]
      );
      inserted.push(result.rows[0]);

      // Version history
      await pool.query(
        `INSERT INTO test_case_versions (test_case_id, version_number, title, description, steps, expected_result, priority, changed_by, change_reason)
         VALUES ($1,1,$2,$3,$4,$5,$6,$7,'Imported from file')`,
        [result.rows[0].id, title, getMapped(row, mapping.description),
         JSON.stringify(normalizeSteps(getMapped(row, mapping.steps))),
         getMapped(row, mapping.expected_result), getMapped(row, mapping.priority, 'Medium'), userId]
      );
    }

    fs.unlinkSync(filePath);

    res.json({ message: `${inserted.length} test cases imported successfully`, imported: inserted.length });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload test cases from file (legacy direct import, kept for backwards compatibility)
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workspaceId = req.user.workspace_id;
    const userId = req.user.id;
    const templateId = req.body.template_id;

    const getValue = (row, keys, fallback = '') => {
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null) {
          return row[key];
        }
      }
      return fallback;
    };

    const normalizeSteps = (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return [];
        // If it's JSON array-like, parse it
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          // not JSON
        }
        // Otherwise treat as newline-separated list
        return trimmed.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      }
      return [];
    };

    const upsertTestCase = async (tc) => {
      // If ID is provided and exists in this workspace, update it; otherwise insert new
      if (tc.id) {
        const existing = await pool.query(
          'SELECT id FROM test_cases WHERE id = $1 AND workspace_id = $2',
          [tc.id, workspaceId]
        );
        if (existing.rows.length > 0) {
          const result = await pool.query(
            `UPDATE test_cases SET template_id = $1, title = $2, description = $3, steps = $4, expected_result = $5, priority = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 AND workspace_id = $8 RETURNING *`,
            [templateId || null, tc.title, tc.description, JSON.stringify(tc.steps), tc.expected_result, tc.priority, tc.id, workspaceId]
          );

          // Save version history
          await pool.query(
            `INSERT INTO test_case_versions (test_case_id, version_number, title, description, steps, expected_result, priority, changed_by, change_reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [tc.id, 1, tc.title, tc.description, JSON.stringify(tc.steps), tc.expected_result, tc.priority, userId, 'Imported update']
          );

          return result.rows[0];
        }
      }

      const result = await pool.query(
        `INSERT INTO test_cases (workspace_id, template_id, title, description, steps, expected_result, priority, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [workspaceId, templateId || null, tc.title, tc.description, JSON.stringify(tc.steps), tc.expected_result, tc.priority, userId]
      );

      // Create version 1
      await pool.query(
        `INSERT INTO test_case_versions (test_case_id, version_number, title, description, steps, expected_result, priority, changed_by, change_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [result.rows[0].id, 1, tc.title, tc.description, JSON.stringify(tc.steps), tc.expected_result, tc.priority, userId, 'Imported from file']
      );

      return result.rows[0];
    };

    // Parse file based on type
    const ext = path.extname(req.file.originalname).toLowerCase();
    const testCases = [];

    if (ext === '.csv') {
      const csvData = fs.readFileSync(req.file.path, 'utf8');
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      for (const row of records) {
        testCases.push({
          id: getValue(row, ['id', 'ID', 'Id'], null),
          title: getValue(row, ['title', 'Title'], 'Test Case'),
          description: getValue(row, ['description', 'Description'], ''),
          steps: normalizeSteps(getValue(row, ['steps', 'Steps'], '')),
          expected_result: getValue(row, ['expected_result', 'Expected Result', 'ExpectedResult'], ''),
          priority: getValue(row, ['priority', 'Priority'], 'Medium')
        });
      }
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      for (const row of data) {
        testCases.push({
          id: getValue(row, ['id', 'ID', 'Id'], null),
          title: getValue(row, ['Title', 'title'], 'Test Case'),
          description: getValue(row, ['Description', 'description'], ''),
          steps: normalizeSteps(getValue(row, ['Steps', 'steps'], '')),
          expected_result: getValue(row, ['Expected Result', 'expected_result', 'expectedResult'], ''),
          priority: getValue(row, ['Priority', 'priority'], 'Medium')
        });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Use CSV or XLSX' });
    }

    // Insert/update test cases
    const insertedCases = [];
    for (const tc of testCases) {
      const inserted = await upsertTestCase(tc);
      insertedCases.push(inserted);
    }

    // Cleanup
    fs.unlinkSync(req.file.path);

    res.json({
      message: `${insertedCases.length} test cases imported successfully`,
      imported: insertedCases.length,
      testCases: insertedCases
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
