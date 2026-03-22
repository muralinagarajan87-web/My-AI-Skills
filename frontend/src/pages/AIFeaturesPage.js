import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Chip, CircularProgress,
  Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Alert, LinearProgress, Tooltip, IconButton, Stack, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl,
  InputLabel, Select, MenuItem
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SyncProblemIcon from '@mui/icons-material/SyncProblem';
import CheckIcon from '@mui/icons-material/Check';
import { aiAPI, testCaseAPI } from '../services/api';

const RISK_COLOR = { High: '#dc2626', Medium: '#d97706', Low: '#16a34a' };
const PRIORITY_COLOR = { Critical: '#dc2626', High: '#d97706', Medium: '#2563eb', Low: '#64748b' };

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ── Generate Tests Tab ─────────────────────────────────────────────────
function GenerateTab() {
  const [description, setDescription] = useState('');
  const [testType, setTestType] = useState('functional');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError('');
    setGenerated([]);
    setSelected(new Set());
    setImportDone(false);
    try {
      const res = await aiAPI.generate({ feature_description: description, test_type: testType, count });
      setGenerated(res.data.test_cases || []);
      setSelected(new Set(res.data.test_cases.map((_, i) => i)));
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to generate test cases');
    }
    setLoading(false);
  };

  const toggleSelect = (i) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const handleImport = async () => {
    setImporting(true);
    const toImport = generated.filter((_, i) => selected.has(i));
    try {
      for (const tc of toImport) {
        await testCaseAPI.create({
          title: tc.title,
          description: tc.description,
          preconditions: tc.preconditions,
          steps: tc.steps,
          expected_result: tc.expected_result,
          priority: tc.priority,
          type: tc.type,
        });
      }
      setImportDone(true);
    } catch (e) {
      setError('Import failed: ' + (e.response?.data?.error || e.message));
    }
    setImporting(false);
  };

  return (
    <Box>
      <Paper sx={{ borderRadius: '16px', p: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#1a2e1f', mb: 0.5 }}>
          Generate Test Cases from Feature Description
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2.5 }}>
          Describe a feature or user story and AI will generate comprehensive test cases covering happy path, edge cases, and negative scenarios.
        </Typography>

        <TextField
          fullWidth multiline rows={5}
          label="Feature Description"
          placeholder="Example: Users can reset their password by entering their email address. The system sends a reset link to the email. The link expires after 24 hours. Users must enter a new password that is at least 8 characters with uppercase, lowercase, and a number."
          value={description}
          onChange={e => setDescription(e.target.value)}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Test Type</InputLabel>
            <Select value={testType} label="Test Type" onChange={e => setTestType(e.target.value)}
              sx={{ borderRadius: '10px' }}>
              <MenuItem value="functional">Functional</MenuItem>
              <MenuItem value="negative">Negative / Error</MenuItem>
              <MenuItem value="boundary">Boundary / Edge Cases</MenuItem>
              <MenuItem value="integration">Integration</MenuItem>
              <MenuItem value="smoke">Smoke</MenuItem>
              <MenuItem value="regression">Regression</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Count</InputLabel>
            <Select value={count} label="Count" onChange={e => setCount(e.target.value)}
              sx={{ borderRadius: '10px' }}>
              {[3, 5, 8, 10, 15].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading || !description.trim()}
            startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon />}
            sx={{
              bgcolor: '#225038', '&:hover': { bgcolor: '#1a3d2b' }, textTransform: 'none',
              fontWeight: 700, px: 3, py: 1.4, borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(34,80,56,0.3)'
            }}
          >
            {loading ? 'Generating…' : 'Generate'}
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>}
      {importDone && <Alert severity="success" sx={{ mb: 2, borderRadius: '10px' }}>✅ {selected.size} test cases imported successfully!</Alert>}

      {generated.length > 0 && (
        <Paper sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1a2e1f' }}>
              {generated.length} Test Cases Generated
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button size="small" onClick={() => setSelected(new Set(generated.map((_, i) => i)))}
                sx={{ textTransform: 'none', fontSize: 12 }}>Select All</Button>
              <Button size="small" onClick={() => setSelected(new Set())}
                sx={{ textTransform: 'none', fontSize: 12, color: '#64748b' }}>Deselect All</Button>
              <Button
                variant="contained" size="small"
                onClick={handleImport}
                disabled={importing || selected.size === 0}
                startIcon={importing ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <AddCircleOutlineIcon />}
                sx={{ bgcolor: '#225038', '&:hover': { bgcolor: '#1a3d2b' }, textTransform: 'none', borderRadius: '8px', fontWeight: 700 }}
              >
                Import Selected ({selected.size})
              </Button>
            </Stack>
          </Box>

          {generated.map((tc, i) => (
            <Box
              key={i}
              onClick={() => toggleSelect(i)}
              sx={{
                p: 3, borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                bgcolor: selected.has(i) ? '#f0fdf4' : '#fff',
                transition: 'background 0.15s',
                '&:hover': { bgcolor: selected.has(i) ? '#dcfce7' : '#f8fafc' },
                display: 'flex', gap: 2
              }}
            >
              <Box sx={{
                width: 22, height: 22, borderRadius: '6px', border: '2px solid',
                borderColor: selected.has(i) ? '#16a34a' : '#e2e8f0',
                bgcolor: selected.has(i) ? '#16a34a' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, mt: 0.3
              }}>
                {selected.has(i) && <CheckIcon sx={{ fontSize: 14, color: '#fff' }} />}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{tc.title}</Typography>
                  {tc.priority && (
                    <Chip label={tc.priority} size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#f0fdf4', color: '#166534' }} />
                  )}
                  {tc.type && (
                    <Chip label={tc.type} size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#eff6ff', color: '#1d4ed8' }} />
                  )}
                </Box>
                {tc.description && (
                  <Typography sx={{ fontSize: 13, color: '#64748b', mb: 1 }}>{tc.description}</Typography>
                )}
                {tc.steps && tc.steps.length > 0 && (
                  <Box sx={{ ml: 1 }}>
                    {tc.steps.slice(0, 3).map((s, j) => (
                      <Typography key={j} sx={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
                        {j + 1}. {s}
                      </Typography>
                    ))}
                    {tc.steps.length > 3 && (
                      <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>…+{tc.steps.length - 3} more steps</Typography>
                    )}
                  </Box>
                )}
                {tc.expected_result && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <Typography sx={{ fontSize: 12, color: '#166534' }}>
                      <strong>Expected:</strong> {tc.expected_result}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}

// ── Risk Score Tab ─────────────────────────────────────────────────────
function RiskScoreTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    aiAPI.getRiskScores()
      .then(r => setData(r.data.risk_scores || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: '#225038' }} /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[
          { label: 'High Risk', count: data.filter(d => d.risk_level === 'High').length, color: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
          { label: 'Medium Risk', count: data.filter(d => d.risk_level === 'Medium').length, color: '#fef9c3', border: '#fde047', text: '#854d0e' },
          { label: 'Low Risk', count: data.filter(d => d.risk_level === 'Low').length, color: '#dcfce7', border: '#86efac', text: '#166534' },
        ].map(s => (
          <Paper key={s.label} sx={{ flex: 1, p: 2.5, borderRadius: '14px', bgcolor: s.color, border: `1px solid ${s.border}`, boxShadow: 'none', textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, fontSize: 28, color: s.text }}>{s.count}</Typography>
            <Typography sx={{ fontSize: 13, color: s.text, fontWeight: 600 }}>{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      <Paper sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #f1f5f9' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1a2e1f' }}>Risk Analysis</Typography>
          <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Based on failure history, staleness, priority, and complexity</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Test Case</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Risk</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Score</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Fail Rate</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Total Runs</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Days Since Run</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map(tc => (
                <TableRow key={tc.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{tc.title}</Typography>
                    {tc.priority && (
                      <Chip label={tc.priority} size="small" sx={{ fontSize: 10, height: 18, mt: 0.5, color: PRIORITY_COLOR[tc.priority] || '#64748b', bgcolor: '#f8fafc' }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tc.risk_level}
                      size="small"
                      icon={<WarningAmberIcon sx={{ fontSize: '14px !important' }} />}
                      sx={{
                        fontWeight: 700, fontSize: 11,
                        bgcolor: tc.risk_level === 'High' ? '#fee2e2' : tc.risk_level === 'Medium' ? '#fef9c3' : '#dcfce7',
                        color: RISK_COLOR[tc.risk_level],
                        border: `1px solid ${tc.risk_level === 'High' ? '#fca5a5' : tc.risk_level === 'Medium' ? '#fde047' : '#86efac'}`
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 60, height: 6, borderRadius: 99, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                        <Box sx={{ width: `${tc.risk_score}%`, height: '100%', borderRadius: 99, bgcolor: RISK_COLOR[tc.risk_level] }} />
                      </Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: RISK_COLOR[tc.risk_level] }}>{tc.risk_score}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, color: tc.factors.failure_rate > 50 ? '#dc2626' : '#475569', fontWeight: tc.factors.failure_rate > 50 ? 700 : 400 }}>
                      {tc.factors.failure_rate}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, color: '#475569' }}>{tc.factors.total_runs}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, color: tc.factors.days_since_run >= 14 ? '#dc2626' : '#475569', fontWeight: tc.factors.days_since_run >= 14 ? 700 : 400 }}>
                      {tc.factors.days_since_run === 30 && tc.factors.total_runs === 0 ? 'Never' : `${tc.factors.days_since_run}d`}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

// ── Flaky Tests Tab ────────────────────────────────────────────────────
function FlakyTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    aiAPI.getPredictFlaky()
      .then(r => setData(r.data.flaky_tests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: '#225038' }} /></Box>;

  if (data.length === 0) {
    return (
      <Paper sx={{ borderRadius: '16px', p: 6, textAlign: 'center', boxShadow: 'none', border: '1px solid #f1f5f9' }}>
        <SyncProblemIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
        <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#475569', mb: 1 }}>No Flaky Tests Detected</Typography>
        <Typography sx={{ fontSize: 14, color: '#94a3b8' }}>
          Tests need at least 3 runs to analyze flakiness patterns. Run your tests more to build history.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
        <strong>{data.length} potentially flaky test{data.length !== 1 ? 's' : ''} detected.</strong> These tests alternate between passing and failing, suggesting environment dependencies, timing issues, or data dependencies.
      </Alert>
      <Paper sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Test Case</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Flakiness</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Fail Rate</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Pass / Fail / Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map(tc => (
                <TableRow key={tc.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{tc.title}</Typography>
                    {tc.priority && <Chip label={tc.priority} size="small" sx={{ fontSize: 10, height: 18, mt: 0.5, color: PRIORITY_COLOR[tc.priority] || '#64748b', bgcolor: '#f8fafc' }} />}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 70, height: 8, borderRadius: 99, bgcolor: '#fef9c3', overflow: 'hidden' }}>
                        <Box sx={{ width: `${tc.flakiness_score}%`, height: '100%', borderRadius: 99, bgcolor: '#d97706' }} />
                      </Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{tc.flakiness_score}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, color: '#d97706', fontWeight: 700 }}>{tc.fail_rate}%</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Chip label={`✓ ${tc.pass_count}`} size="small" sx={{ fontSize: 11, bgcolor: '#dcfce7', color: '#166534' }} />
                      <Chip label={`✗ ${tc.fail_count}`} size="small" sx={{ fontSize: 11, bgcolor: '#fee2e2', color: '#991b1b' }} />
                      <Chip label={`${tc.total_runs} runs`} size="small" sx={{ fontSize: 11, bgcolor: '#f1f5f9', color: '#475569' }} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

// ── Duplicates Tab ─────────────────────────────────────────────────────
function DuplicatesTab() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleDetect = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await aiAPI.detectDuplicates({ title, description });
      setResults(res.data.duplicates || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Detection failed');
    }
    setLoading(false);
  };

  return (
    <Box>
      <Paper sx={{ borderRadius: '16px', p: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#1a2e1f', mb: 0.5 }}>
          Detect Duplicate Test Cases
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2.5 }}>
          Enter a new test case title/description to check for similar tests already in your suite.
        </Typography>
        <TextField fullWidth label="Test Case Title" value={title} onChange={e => setTitle(e.target.value)}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
        <TextField fullWidth label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)}
          multiline rows={2} sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
        <Button
          variant="contained"
          onClick={handleDetect}
          disabled={loading || !title.trim()}
          startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SearchIcon />}
          sx={{ bgcolor: '#225038', '&:hover': { bgcolor: '#1a3d2b' }, textTransform: 'none', fontWeight: 700, px: 3, py: 1.3, borderRadius: '10px' }}
        >
          {loading ? 'Scanning…' : 'Check for Duplicates'}
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>}

      {results !== null && (
        results.length === 0 ? (
          <Alert severity="success" sx={{ borderRadius: '12px' }}>
            ✅ No duplicates found! This appears to be a unique test case.
          </Alert>
        ) : (
          <Paper sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #f1f5f9', bgcolor: '#fff7ed' }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#c2410c' }}>
                ⚠️ {results.length} potential duplicate{results.length > 1 ? 's' : ''} found
              </Typography>
            </Box>
            {results.map((dup, i) => (
              <Box key={i} sx={{ px: 3, py: 2.5, borderBottom: '1px solid #f1f5f9' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{dup.title}</Typography>
                    <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5 }}>{dup.reason}</Typography>
                  </Box>
                  <Chip
                    label={`${dup.similarity}% match`}
                    sx={{
                      fontWeight: 700, fontSize: 12, flexShrink: 0,
                      bgcolor: dup.similarity >= 90 ? '#fee2e2' : '#fef9c3',
                      color: dup.similarity >= 90 ? '#991b1b' : '#854d0e'
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Paper>
        )
      )}
    </Box>
  );
}

// ── Tag Suggestions Tab ───────────────────────────────────────────────
function TagSuggestTab() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSuggest = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await aiAPI.suggestTags({ title, description });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to suggest tags');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!result?.tags) return;
    navigator.clipboard.writeText(result.tags.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box>
      <Paper sx={{ borderRadius: '16px', p: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#1a2e1f', mb: 0.5 }}>
          AI Tag Suggestions
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2.5 }}>
          Get smart tag/label recommendations to help categorize and filter your test cases.
        </Typography>
        <TextField fullWidth label="Test Case Title" value={title} onChange={e => setTitle(e.target.value)}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
        <TextField fullWidth label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)}
          multiline rows={2} sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
        <Button
          variant="contained"
          onClick={handleSuggest}
          disabled={loading || !title.trim()}
          startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <LocalOfferIcon />}
          sx={{ bgcolor: '#225038', '&:hover': { bgcolor: '#1a3d2b' }, textTransform: 'none', fontWeight: 700, px: 3, py: 1.3, borderRadius: '10px' }}
        >
          {loading ? 'Thinking…' : 'Suggest Tags'}
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>}

      {result && (
        <Paper sx={{ borderRadius: '16px', p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1a2e1f' }}>Suggested Tags</Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy tags'}>
              <IconButton size="small" onClick={handleCopy} sx={{ color: '#64748b' }}>
                {copied ? <CheckIcon fontSize="small" sx={{ color: '#16a34a' }} /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {result.tags?.map(tag => (
              <Chip
                key={tag}
                label={tag}
                sx={{
                  fontWeight: 600, fontSize: 13, py: 0.5,
                  bgcolor: '#e8f5e9', color: '#1a3d2b',
                  border: '1px solid #a7f3d0',
                  '&:hover': { bgcolor: '#dcfce7' }
                }}
              />
            ))}
          </Box>
          {result.reasoning && (
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <Typography sx={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>{result.reasoning}</Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function AIFeaturesPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Hero */}
      <Box sx={{
        background: 'linear-gradient(135deg, #152e1f 0%, #1e4533 60%, #225038 100%)',
        px: { xs: 2, md: 5 }, pt: 5, pb: 4
      }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <AutoAwesomeIcon sx={{ color: '#4ade80', fontSize: 36 }} />
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 28 }}>AI Features</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                Powered by LLaMA 3.3 70B — Generate, analyze, and optimize your test suite
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: { xs: 2, md: 5 } }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 14, color: '#64748b' },
              '& .Mui-selected': { color: '#225038 !important' },
              '& .MuiTabs-indicator': { bgcolor: '#225038' }
            }}
          >
            <Tab icon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Generate Tests" />
            <Tab icon={<WarningAmberIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Risk Scores" />
            <Tab icon={<SyncProblemIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Flaky Tests" />
            <Tab icon={<SearchIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Duplicate Detection" />
            <Tab icon={<LocalOfferIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Tag Suggestions" />
          </Tabs>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
        <TabPanel value={tab} index={0}><GenerateTab /></TabPanel>
        <TabPanel value={tab} index={1}><RiskScoreTab /></TabPanel>
        <TabPanel value={tab} index={2}><FlakyTab /></TabPanel>
        <TabPanel value={tab} index={3}><DuplicatesTab /></TabPanel>
        <TabPanel value={tab} index={4}><TagSuggestTab /></TabPanel>
      </Box>
    </Box>
  );
}
