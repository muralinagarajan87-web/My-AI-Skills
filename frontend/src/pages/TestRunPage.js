import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Button, TextField, LinearProgress, Paper,
  IconButton, Tooltip, Alert, Stack, Avatar, Dialog,
  DialogTitle, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  Stepper, Step, StepLabel, StepContent
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BugReportIcon from '@mui/icons-material/BugReport';
import { testRunAPI } from '../services/api';

const STATUS_COLOR = {
  Pass: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  Fail: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  Skip: { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  'Not Started': { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};

function ResultBadge({ result }) {
  const s = STATUS_COLOR[result] || STATUS_COLOR['Not Started'];
  return (
    <Box sx={{
      px: 1.5, py: 0.5, borderRadius: '6px', fontSize: 12, fontWeight: 700,
      bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}`,
      display: 'inline-flex', alignItems: 'center', gap: 0.5
    }}>
      {result === 'Pass' && <CheckCircleIcon sx={{ fontSize: 13 }} />}
      {result === 'Fail' && <CancelIcon sx={{ fontSize: 13 }} />}
      {result === 'Skip' && <SkipNextIcon sx={{ fontSize: 13 }} />}
      {result || 'Not Started'}
    </Box>
  );
}

export default function TestRunPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [testRun, setTestRun] = useState(null);
  const [mode, setMode] = useState('overview'); // 'overview' | 'execute'
  const [currentIdx, setCurrentIdx] = useState(0);
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [showBugDialog, setShowBugDialog] = useState(false);
  const [bugNote, setBugNote] = useState('');

  const load = async () => {
    try {
      const response = await testRunAPI.get(id);
      setTestRun(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!testRun) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#225038' }} />
      </Box>
    );
  }

  const results = testRun.results || [];
  const stats = {
    total: results.length,
    passed: results.filter(r => r.result === 'Pass').length,
    failed: results.filter(r => r.result === 'Fail').length,
    skipped: results.filter(r => r.result === 'Skip').length,
    notStarted: results.filter(r => !r.result || r.result === 'Not Started').length,
  };
  const progressPct = stats.total > 0
    ? Math.round(((stats.passed + stats.failed + stats.skipped) / stats.total) * 100)
    : 0;
  const passRate = (stats.passed + stats.failed) > 0
    ? Math.round((stats.passed / (stats.passed + stats.failed)) * 100)
    : 0;

  const isCompleted = testRun.computed_status === 'Completed' || testRun.status === 'Completed';

  // Find first unexecuted test for "Continue" button
  const firstPendingIdx = results.findIndex(r => !r.result || r.result === 'Not Started');

  const handleStartExecute = (startIdx = 0) => {
    const idx = startIdx >= 0 ? startIdx : 0;
    setCurrentIdx(idx);
    const currentResult = results[idx];
    setComments(currentResult?.comments || '');
    setMode('execute');
  };

  const handleSubmitResult = async (status) => {
    const current = results[currentIdx];
    if (!current) return;
    setSaving(true);
    try {
      await testRunAPI.updateResult(current.id, { result_status: status, comments });
      await load();
      setComments('');

      // Auto-advance to next pending
      const updatedResults = testRun.results || [];
      const nextPending = updatedResults.findIndex((r, i) => i > currentIdx && (!r.result || r.result === 'Not Started'));
      if (nextPending !== -1) {
        setCurrentIdx(nextPending);
        setComments(updatedResults[nextPending]?.comments || '');
      } else if (currentIdx < results.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setComments(results[currentIdx + 1]?.comments || '');
      } else {
        setMode('overview');
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleNav = (dir) => {
    const newIdx = currentIdx + dir;
    if (newIdx < 0 || newIdx >= results.length) return;
    setCurrentIdx(newIdx);
    setComments(results[newIdx]?.comments || '');
  };

  const current = results[currentIdx];

  // ── EXECUTE MODE ──────────────────────────────────────────────────────
  if (mode === 'execute') {
    const steps = Array.isArray(current?.steps) ? current.steps
      : (current?.steps ? [current.steps] : []);

    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
        {/* Header bar */}
        <Box sx={{
          background: 'linear-gradient(90deg, #152e1f 0%, #1e4533 100%)',
          px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2,
          position: 'sticky', top: 0, zIndex: 100
        }}>
          <IconButton onClick={() => setMode('overview')} sx={{ color: '#fff', mr: 1 }}>
            <ListAltIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
              {testRun.name}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              Test {currentIdx + 1} of {results.length}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{progressPct}% done</Typography>
            <Box sx={{ width: 120, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 6 }}>
              <Box sx={{ width: `${progressPct}%`, bgcolor: '#4ade80', height: 6, borderRadius: 99, transition: 'width 0.4s' }} />
            </Box>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 880, mx: 'auto', p: 3 }}>
          {/* Case navigation mini-strip */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 3, flexWrap: 'wrap' }}>
            {results.map((r, i) => {
              const s = STATUS_COLOR[r.result] || STATUS_COLOR['Not Started'];
              return (
                <Tooltip key={r.id} title={r.test_case_title} arrow>
                  <Box
                    onClick={() => { setCurrentIdx(i); setComments(r.comments || ''); }}
                    sx={{
                      width: 28, height: 28, borderRadius: '6px', cursor: 'pointer',
                      bgcolor: i === currentIdx ? '#225038' : s.bg,
                      border: `2px solid ${i === currentIdx ? '#4ade80' : s.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: i === currentIdx ? '#fff' : s.color,
                      transition: 'all 0.15s'
                    }}
                  >
                    {i + 1}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>

          {/* Main test case card */}
          <Paper sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            {/* Case header */}
            <Box sx={{
              px: 3, py: 2.5,
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2
            }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: '#e8f5e9', color: '#225038', fontSize: 12, fontWeight: 700 }}>
                    {currentIdx + 1}
                  </Avatar>
                  <Typography sx={{ fontWeight: 700, fontSize: 17, color: '#1a2e1f', lineHeight: 1.3 }}>
                    {current?.test_case_title}
                  </Typography>
                </Box>
                {current?.priority && (
                  <Chip label={current.priority} size="small" sx={{ fontSize: 11, height: 22, bgcolor: '#f0fdf4', color: '#166534' }} />
                )}
              </Box>
              <ResultBadge result={current?.result} />
            </Box>

            <Box sx={{ px: 3, py: 2.5 }}>
              {/* Preconditions */}
              {current?.preconditions && (
                <Box sx={{ mb: 3, p: 2, bgcolor: '#fefce8', borderRadius: '10px', border: '1px solid #fef08a' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#854d0e', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Preconditions
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: '#713f12' }}>{current.preconditions}</Typography>
                </Box>
              )}

              {/* Steps */}
              {steps.length > 0 ? (
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Test Steps
                  </Typography>
                  <Stepper orientation="vertical" sx={{ ml: 0 }}>
                    {steps.map((step, i) => (
                      <Step key={i} active>
                        <StepLabel
                          StepIconProps={{
                            sx: { color: '#225038', '&.Mui-active': { color: '#225038' } }
                          }}
                        >
                          <Typography sx={{ fontSize: 14, color: '#1e293b', lineHeight: 1.6 }}>{step}</Typography>
                        </StepLabel>
                        <StepContent><Box /></StepContent>
                      </Step>
                    ))}
                  </Stepper>
                </Box>
              ) : current?.description ? (
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>Steps / Description</Typography>
                  <Typography sx={{ fontSize: 14, color: '#1e293b', lineHeight: 1.7 }}>{current.description}</Typography>
                </Box>
              ) : null}

              {/* Expected Result */}
              {current?.expected_result && (
                <Box sx={{ mb: 3, p: 2, bgcolor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#166534', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Expected Result
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: '#14532d', lineHeight: 1.6 }}>{current.expected_result}</Typography>
                </Box>
              )}

              {/* Comments */}
              <TextField
                fullWidth
                label="Execution Notes (optional)"
                placeholder="Describe what you observed, any errors, environment details..."
                value={comments}
                onChange={e => setComments(e.target.value)}
                multiline
                rows={3}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 }
                }}
              />

              {/* Action buttons */}
              <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => handleSubmitResult('Pass')}
                  disabled={saving}
                  startIcon={<CheckCircleIcon />}
                  sx={{
                    flex: 1, py: 1.5, fontSize: 15, fontWeight: 700,
                    bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' },
                    borderRadius: '10px', textTransform: 'none',
                    boxShadow: '0 2px 8px rgba(22,163,74,0.3)'
                  }}
                >
                  Pass
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleSubmitResult('Fail')}
                  disabled={saving}
                  startIcon={<CancelIcon />}
                  sx={{
                    flex: 1, py: 1.5, fontSize: 15, fontWeight: 700,
                    bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' },
                    borderRadius: '10px', textTransform: 'none',
                    boxShadow: '0 2px 8px rgba(220,38,38,0.3)'
                  }}
                >
                  Fail
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleSubmitResult('Skip')}
                  disabled={saving}
                  startIcon={<SkipNextIcon />}
                  sx={{
                    flex: 0.6, py: 1.5, fontSize: 14, fontWeight: 700,
                    borderRadius: '10px', textTransform: 'none',
                    borderColor: '#e2e8f0', color: '#64748b',
                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }
                  }}
                >
                  Skip
                </Button>
              </Stack>

              {/* Navigation + bug report row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Button
                  onClick={() => handleNav(-1)}
                  disabled={currentIdx === 0}
                  startIcon={<ArrowBackIosNewIcon sx={{ fontSize: 14 }} />}
                  sx={{ color: '#64748b', textTransform: 'none', fontSize: 13, fontWeight: 600 }}
                >
                  Previous
                </Button>

                <Tooltip title="Log a bug for this test case">
                  <Button
                    size="small"
                    startIcon={<BugReportIcon />}
                    onClick={() => setShowBugDialog(true)}
                    sx={{
                      color: '#dc2626', textTransform: 'none', fontSize: 12, fontWeight: 600,
                      border: '1px solid #fecaca', borderRadius: '8px', px: 1.5,
                      '&:hover': { bgcolor: '#fee2e2' }
                    }}
                  >
                    Log Bug
                  </Button>
                </Tooltip>

                <Button
                  onClick={() => handleNav(1)}
                  disabled={currentIdx === results.length - 1}
                  endIcon={<ArrowForwardIosIcon sx={{ fontSize: 14 }} />}
                  sx={{ color: '#64748b', textTransform: 'none', fontSize: 13, fontWeight: 600 }}
                >
                  Next
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Bug dialog */}
        <Dialog open={showBugDialog} onClose={() => setShowBugDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>Log Bug</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2 }}>
              Test case: <strong>{current?.test_case_title}</strong>
            </Typography>
            <TextField
              fullWidth label="Bug Description" multiline rows={4}
              value={bugNote} onChange={e => setBugNote(e.target.value)}
              placeholder="Describe the bug, steps to reproduce, actual vs expected..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setShowBugDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => { setComments(prev => prev ? `${prev}\n\nBug: ${bugNote}` : `Bug: ${bugNote}`); setBugNote(''); setShowBugDialog(false); }}
              sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, textTransform: 'none' }}
            >
              Add to Notes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // ── OVERVIEW MODE ─────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Hero header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #152e1f 0%, #1e4533 60%, #225038 100%)',
        px: { xs: 2, md: 5 }, pt: 5, pb: 4
      }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
            <AssignmentTurnedInIcon sx={{ color: '#4ade80', fontSize: 36, mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: { xs: 22, md: 28 }, lineHeight: 1.2 }}>
                {testRun.name}
              </Typography>
              {testRun.description && (
                <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, mt: 0.5 }}>
                  {testRun.description}
                </Typography>
              )}
            </Box>
            <Chip
              label={testRun.computed_status || testRun.status || 'In Progress'}
              sx={{
                bgcolor: isCompleted ? '#4ade80' : '#fde68a',
                color: isCompleted ? '#14532d' : '#78350f',
                fontWeight: 700, fontSize: 13
              }}
            />
          </Box>

          {/* Stats row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
            {[
              { label: 'Total', val: stats.total, color: '#fff', bg: 'rgba(255,255,255,0.12)' },
              { label: 'Passed', val: stats.passed, color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
              { label: 'Failed', val: stats.failed, color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
              { label: 'Skipped', val: stats.skipped, color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
              { label: 'Pass Rate', val: `${passRate}%`, color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
            ].map(s => (
              <Box key={s.label} sx={{ bgcolor: s.bg, borderRadius: '12px', p: 2, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography sx={{ color: s.color, fontWeight: 800, fontSize: 24 }}>{s.val}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>

          {/* Progress bar */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Overall Progress</Typography>
              <Typography sx={{ color: '#4ade80', fontSize: 13, fontWeight: 700 }}>{progressPct}%</Typography>
            </Box>
            <Box sx={{ height: 8, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
              <Box sx={{ width: `${progressPct}%`, height: '100%', bgcolor: '#4ade80', borderRadius: 99, transition: 'width 0.5s ease' }} />
            </Box>
          </Box>

          {/* CTA buttons */}
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            {!isCompleted && (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={() => handleStartExecute(firstPendingIdx >= 0 ? firstPendingIdx : 0)}
                sx={{
                  bgcolor: '#4ade80', color: '#14532d', fontWeight: 700, fontSize: 15,
                  py: 1.5, px: 3.5, borderRadius: '10px', textTransform: 'none',
                  '&:hover': { bgcolor: '#22c55e' },
                  boxShadow: '0 4px 12px rgba(74,222,128,0.4)'
                }}
              >
                {firstPendingIdx >= 0 ? 'Continue Execution' : 'Start Execution'}
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<ListAltIcon />}
              onClick={() => navigate('/test-runs')}
              sx={{ color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'none', fontWeight: 600, borderRadius: '10px', py: 1.5 }}
            >
              All Runs
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
        {isCompleted && (
          <Alert
            icon={<AssignmentTurnedInIcon />}
            severity="success"
            sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}
          >
            All test cases have been executed. This run is now <strong>Completed</strong>.
          </Alert>
        )}

        {/* Result breakdown bars */}
        <Paper sx={{ borderRadius: '16px', p: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#1a2e1f', mb: 2 }}>Result Breakdown</Typography>
          {[
            { label: 'Pass', count: stats.passed, color: '#16a34a', bg: '#dcfce7' },
            { label: 'Fail', count: stats.failed, color: '#dc2626', bg: '#fee2e2' },
            { label: 'Skip', count: stats.skipped, color: '#d97706', bg: '#fef3c7' },
            { label: 'Not Started', count: stats.notStarted, color: '#475569', bg: '#f1f5f9' },
          ].map(row => (
            <Box key={row.label} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.label}</Typography>
                <Typography sx={{ fontSize: 13, color: '#64748b' }}>{row.count}</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.total ? (row.count / stats.total) * 100 : 0}
                sx={{
                  height: 10, borderRadius: 99,
                  bgcolor: '#f1f5f9',
                  '& .MuiLinearProgress-bar': { bgcolor: row.color, borderRadius: 99 }
                }}
              />
            </Box>
          ))}
        </Paper>

        {/* Test cases table */}
        <Paper sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#1a2e1f' }}>Test Cases</Typography>
            {!isCompleted && (
              <Typography sx={{ fontSize: 13, color: '#64748b' }}>
                Click <strong>Execute</strong> to run a specific test
              </Typography>
            )}
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Test Case</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Result</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result, i) => (
                  <TableRow
                    key={result.id}
                    hover
                    sx={{ '&:hover': { bgcolor: '#f8fafc' }, cursor: 'default' }}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, color: '#94a3b8', fontSize: 13 }}>
                        {String(i + 1).padStart(2, '0')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
                        {result.test_case_title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <ResultBadge result={result.result} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, color: '#64748b', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {result.comments || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant={result.result && result.result !== 'Not Started' ? 'outlined' : 'contained'}
                        onClick={() => handleStartExecute(i)}
                        sx={{
                          textTransform: 'none', fontSize: 12, fontWeight: 600,
                          borderRadius: '8px', py: 0.5,
                          ...(result.result && result.result !== 'Not Started'
                            ? { borderColor: '#e2e8f0', color: '#64748b' }
                            : { bgcolor: '#225038', '&:hover': { bgcolor: '#1a3d2b' } }
                          )
                        }}
                      >
                        {result.result && result.result !== 'Not Started' ? 'Re-run' : 'Execute'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
}
