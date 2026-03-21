import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Grid,
  MenuItem, Chip, Divider, Avatar, LinearProgress, Select, FormControl,
  IconButton, Tooltip, Badge
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import SpeedIcon from '@mui/icons-material/Speed';
import ChecklistIcon from '@mui/icons-material/Checklist';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import { reportAPI, testRunAPI, templateAPI, workspaceAPI, uploadAPI } from '../services/api';
import UploadMappingDialog from '../components/UploadMappingDialog';

/* ─── Shared card styles ──────────────────────────────────────────── */
const card = {
  elevation: 0,
  sx: {
    border: '1px solid rgba(34,80,56,0.10)',
    borderRadius: '18px',
    bgcolor: 'white',
    height: '100%',
    transition: 'box-shadow 0.22s, transform 0.22s',
    '&:hover': {
      boxShadow: '0 8px 32px rgba(34,80,56,0.10)',
      transform: 'translateY(-2px)',
    },
  },
};

/* ─── Pass Rate Ring ──────────────────────────────────────────────── */
function PassRateRing({ rate }) {
  const r = 52, circ = 2 * Math.PI * r, filled = (rate / 100) * circ;
  const color = rate >= 80 ? '#16a34a' : rate >= 50 ? '#f59e0b' : '#dc2626';
  const trackColor = rate >= 80 ? '#dcfce7' : rate >= 50 ? '#fef3c7' : '#fee2e2';
  return (
    <Box sx={{ position: 'relative', width: 128, height: 128, flexShrink: 0 }}>
      <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke={trackColor} strokeWidth="10" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{rate}%</Typography>
        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, mt: 0.25 }}>Pass Rate</Typography>
      </Box>
    </Box>
  );
}

/* ─── Readiness Gauge (semicircle) ──────────────────────────────── */
function ReadinessGauge({ score }) {
  const cx = 110, cy = 105, r = 88;
  const color = score >= 75 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#dc2626';
  const trackColor = score >= 75 ? '#dcfce7' : score >= 50 ? '#fef3c7' : '#fee2e2';
  const endAngleDeg = 180 - (score / 100) * 180;
  const endAngleRad = (endAngleDeg * Math.PI) / 180;
  const ex = cx + r * Math.cos(endAngleRad);
  const ey = cy - r * Math.sin(endAngleRad);
  const largeArc = score > 50 ? 1 : 0;
  const label = score >= 75 ? 'Ready' : score >= 50 ? 'At Risk' : 'Not Ready';
  return (
    <Box sx={{ textAlign: 'center' }}>
      <svg width="220" height="120" viewBox="0 0 220 120">
        <path d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`} fill="none" stroke={trackColor} strokeWidth="14" strokeLinecap="round" />
        {score > 0 && (
          <path d={`M ${cx - r},${cy} A ${r},${r} 0 ${largeArc},1 ${ex},${ey}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
            style={{ transition: 'all 0.8s ease' }} />
        )}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="32" fontWeight="800" fill={color}>{score}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="12" fontWeight="700" fill="#94a3b8" letterSpacing="1">/100</text>
      </svg>
      <Chip label={label} size="small" sx={{ bgcolor: trackColor, color, fontWeight: 800, fontSize: 12, mt: -1 }} />
    </Box>
  );
}

/* ─── Premium Stat Card ──────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color, bgColor, accentColor }) {
  return (
    <Card {...card} sx={{ ...card.sx, overflow: 'hidden', position: 'relative' }}>
      {/* Accent bar */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: color, opacity: 0.7 }} />
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'text.disabled', mb: 0.75 }}>{label}</Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
            {sub && <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.75, lineHeight: 1.3 }}>{sub}</Typography>}
          </Box>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}99 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px ${color}22`,
          }}>
            <Box sx={{ color, '& svg': { fontSize: 22 } }}>{icon}</Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ─── Status Badge ──────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const isComplete = status === 'Completed';
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.4, borderRadius: '6px',
      bgcolor: isComplete ? '#dcfce7' : '#fef9c3', border: '1px solid', borderColor: isComplete ? '#86efac' : '#fde047' }}>
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: isComplete ? '#16a34a' : '#ca8a04', flexShrink: 0 }} />
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: isComplete ? '#15803d' : '#92400e' }}>{status || 'In Progress'}</Typography>
    </Box>
  );
}

/* ─── Section Title ─────────────────────────────────────────────── */
function SectionTitle({ children, sub }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
        <Box sx={{ width: 3, height: 14, borderRadius: 2, bgcolor: '#4ade80', flexShrink: 0 }} />
        <Typography sx={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: '#1a3d2b' }}>{children}</Typography>
      </Box>
      {sub && <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25, pl: '11px' }}>{sub}</Typography>}
    </Box>
  );
}

/* ─── Bar Chart (pure SVG/CSS) ──────────────────────────────────── */
function MiniBarChart({ data, valueKey, labelKey, color = '#225038', height = 80 }) {
  if (!data || data.length === 0) return <Typography sx={{ fontSize: 12, color: 'text.disabled', py: 2 }}>No data yet</Typography>;
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height, pt: 1 }}>
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = (val / max) * 100;
        return (
          <Tooltip key={i} title={`${d[labelKey]}: ${val}`} arrow>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'default' }}>
              <Box sx={{
                width: '100%',
                background: `linear-gradient(180deg, ${color} 0%, ${color}bb 100%)`,
                borderRadius: '4px 4px 0 0',
                height: `${Math.max(pct, 3)}%`, minHeight: 3,
                transition: 'height 0.4s ease',
                '&:hover': { opacity: 0.85 },
              }} />
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

/* ─── Coverage Heatmap ──────────────────────────────────────────── */
function CoverageHeatmap({ data }) {
  if (!data || data.length === 0) return <Typography sx={{ fontSize: 12, color: 'text.disabled', py: 2 }}>No test cases yet</Typography>;
  const PRIORITY_ORDER = ['Critical','P0','High','P1','Medium','P2','Low','P3'];
  const sorted = [...data].sort((a, b) => {
    const ai = PRIORITY_ORDER.indexOf(a.priority); const bi = PRIORITY_ORDER.indexOf(b.priority);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {sorted.map(row => {
        const total = parseInt(row.total, 10);
        const executed = parseInt(row.executed, 10);
        const passed = parseInt(row.passed, 10);
        const coveragePct = total > 0 ? Math.round((executed / total) * 100) : 0;
        const passPct = executed > 0 ? Math.round((passed / executed) * 100) : 0;
        const health = coveragePct >= 80 && passPct >= 80 ? 'good' : coveragePct >= 50 || passPct >= 60 ? 'warn' : 'risk';
        const hc = health === 'good' ? { bg: '#dcfce7', bar: '#16a34a', text: '#15803d' }
          : health === 'warn' ? { bg: '#fef3c7', bar: '#d97706', text: '#92400e' }
          : { bg: '#fee2e2', bar: '#dc2626', text: '#991b1b' };
        return (
          <Box key={row.priority} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 72, flexShrink: 0 }}>
              <Chip label={row.priority || 'None'} size="small"
                sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: hc.bg, color: hc.text, borderRadius: '5px', width: '100%' }} />
            </Box>
            <Box sx={{ flex: 1, bgcolor: '#f1f5f9', borderRadius: '8px', height: 14, overflow: 'hidden' }}>
              <Box sx={{ width: `${coveragePct}%`, height: '100%', background: `linear-gradient(90deg, ${hc.bar}, ${hc.bar}cc)`, borderRadius: '8px', transition: 'width 0.5s' }} />
            </Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: hc.text, minWidth: 36, textAlign: 'right' }}>{coveragePct}%</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', minWidth: 50 }}>{executed}/{total} run</Typography>
          </Box>
        );
      })}
    </Box>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [testRuns, setTestRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => { loadWorkspace(); loadTemplates(); loadTestRuns(); loadProjects(); }, []);
  useEffect(() => { loadMetrics(selectedRunId || null, selectedProjectId || null); loadDashboard(selectedProjectId || null); }, [selectedRunId, selectedProjectId]);

  const loadWorkspace = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.workspace_id) { const r = await workspaceAPI.get(user.workspace_id); setWorkspaceName(r.data.name); }
    } catch (e) { console.error(e); }
  };
  const loadProjects = async () => {
    try { const r = await workspaceAPI.getAll(); setProjects(r.data); } catch (e) { console.error(e); }
  };
  const loadTemplates = async () => { try { const r = await templateAPI.getAll(); setTemplates(r.data); } catch (e) { console.error(e); } };
  const loadMetrics = async (runId, projectId) => { try { const r = await reportAPI.getMetrics(runId, projectId); setMetrics(r.data); } catch (e) { console.error(e); } };
  const loadTestRuns = async () => { try { const r = await testRunAPI.getAll(); setTestRuns(r.data); } catch (e) { console.error(e); } };
  const loadDashboard = async (projectId) => { try { const r = await reportAPI.getDashboard(projectId); setDashboard(r.data); } catch (e) { console.error(e); } };
  const refreshAutomation = async () => {
    try {
      const r = await reportAPI.getAutomation();
      setDashboard(prev => prev ? { ...prev, automation: { ...prev.automation, ...r.data, by_project: prev.automation?.by_project || [] } } : prev);
    } catch (e) { console.error(e); }
  };

  const handleDownloadExcel = async () => {
    try {
      const response = await uploadAPI.downloadExcel();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url; a.setAttribute('download', 'test-cases.xlsx');
      document.body.appendChild(a); a.click();
    } catch (e) { console.error(e); }
  };

  if (!metrics) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 2 }}>
        <LinearProgress sx={{ width: 220, borderRadius: 2, bgcolor: '#dcfce7', '& .MuiLinearProgress-bar': { bgcolor: '#225038' } }} />
        <Typography variant="body2" color="text.disabled" sx={{ fontSize: 13 }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  const passed   = Number(metrics?.pass_fail_counts?.total_passed  || 0);
  const failed   = Number(metrics?.pass_fail_counts?.total_failed  || 0);
  const skipped  = Number(metrics?.pass_fail_counts?.total_skipped || 0);
  const executed = passed + failed + skipped;
  const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;
  const selectedRun = testRuns.find(r => String(r.id) === String(selectedRunId));
  const rd = dashboard?.readiness || {};
  const debt = dashboard?.test_debt || {};

  const checklist = [
    { label: 'All P0/Critical tests passed', done: rd.critical_pass_rate === 100, warn: rd.critical_pass_rate == null },
    { label: `Execution coverage >= 80%`, done: rd.coverage_pct >= 80, warn: rd.coverage_pct >= 50 && rd.coverage_pct < 80 },
    { label: 'Overall pass rate >= 80%', done: rd.pass_rate >= 80, warn: rd.pass_rate >= 50 && rd.pass_rate < 80 },
    { label: 'No draft test cases remaining', done: rd.draft_count === 0, warn: rd.draft_count > 0 && rd.draft_count <= 5 },
    { label: `All test cases have expected results`, done: debt.no_expected_result === 0, warn: debt.no_expected_result <= 3 },
    { label: 'Flaky tests identified & reviewed', done: (dashboard?.flaky_tests || []).length === 0, warn: (dashboard?.flaky_tests || []).length <= 2 },
  ];

  const checkDone = checklist.filter(c => c.done).length;
  const checkTotal = checklist.length;

  const statCards = [
    { label: 'Total Cases', value: metrics.total_test_cases, color: '#225038', bgColor: 'rgba(34,80,56,0.12)', icon: <AssignmentOutlinedIcon />, sub: 'in workspace' },
    { label: 'Passed', value: passed, color: '#16a34a', bgColor: '#dcfce7', icon: <CheckCircleOutlineIcon />, sub: executed > 0 ? `${Math.round((passed/executed)*100)}% of executed` : 'no results' },
    { label: 'Failed', value: failed, color: '#dc2626', bgColor: '#fee2e2', icon: <CancelOutlinedIcon />, sub: executed > 0 ? `${Math.round((failed/executed)*100)}% of executed` : 'no results' },
    { label: 'Skipped', value: skipped, color: '#d97706', bgColor: '#fef3c7', icon: <RemoveCircleOutlineIcon />, sub: executed > 0 ? `${Math.round((skipped/executed)*100)}% of executed` : 'no results' },
    { label: 'Test Runs', value: metrics.total_runs, color: '#2563eb', bgColor: '#dbeafe', icon: <PlayCircleOutlineIcon />, sub: `${metrics.completed_runs || 0} completed` },
    { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 80 ? '#16a34a' : passRate >= 50 ? '#d97706' : '#dc2626', bgColor: passRate >= 80 ? '#dcfce7' : passRate >= 50 ? '#fef3c7' : '#fee2e2', icon: <TrendingUpIcon />, sub: executed > 0 ? `${executed} executed` : 'no executions yet' },
  ];

  return (
    <Box sx={{ bgcolor: '#f0f4f1', minHeight: '100vh', pb: 8 }}>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <Box sx={{
        background: 'linear-gradient(90deg, #152e1f 0%, #1e4533 50%, #225038 100%)',
        px: { xs: 3, md: 6 }, pt: 4.5, pb: 7, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <Box sx={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', border: '1px solid rgba(74,222,128,0.08)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(74,222,128,0.05)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -60, left: '30%', width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(74,222,128,0.04)', pointerEvents: 'none' }} />
        {/* Subtle grid */}
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, position: 'relative' }}>
          <Box>
            {/* Workspace badge */}
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '20px', px: 1.5, py: 0.5, mb: 1.75 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4ade80', boxShadow: '0 0 0 3px rgba(74,222,128,0.3)' }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1 }}>
                {workspaceName || 'Loading...'}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 34, fontWeight: 900, color: 'white', lineHeight: 1.1, mb: 0.75, letterSpacing: -0.5 }}>
              Test Intelligence
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.2 }}>
              Release readiness · Quality trends · Automation coverage
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Project selector */}
            <FormControl size="small">
              <Select
                value={selectedProjectId}
                onChange={e => { setSelectedProjectId(e.target.value); setSelectedRunId(''); }}
                displayEmpty
                startAdornment={<FolderOpenOutlinedIcon sx={{ color: selectedProjectId ? '#4ade80' : 'rgba(255,255,255,0.5)', fontSize: 16, mr: 0.75, ml: 0.5 }} />}
                endAdornment={<KeyboardArrowDownIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, mr: 1 }} />}
                sx={{
                  bgcolor: selectedProjectId ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${selectedProjectId ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: '12px', color: 'white', minWidth: 180, fontSize: 13,
                  '& .MuiSelect-icon': { display: 'none' }, '& fieldset': { border: 'none' },
                  '&:hover': { bgcolor: 'rgba(74,222,128,0.15)' },
                }}
              >
                <MenuItem value="" sx={{ fontSize: 13, color: 'text.secondary' }}>All Projects</MenuItem>
                {projects.map(p => (
                  <MenuItem key={p.id} value={String(p.id)} sx={{ fontSize: 13 }}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button component={RouterLink} to="/test-runs" variant="contained" startIcon={<AddIcon />}
              sx={{
                bgcolor: '#4ade80', color: '#1a3d2b', fontWeight: 800, borderRadius: '12px', px: 2.5, fontSize: 13,
                boxShadow: '0 4px 16px rgba(74,222,128,0.35)',
                '&:hover': { bgcolor: '#86efac', boxShadow: '0 6px 20px rgba(74,222,128,0.45)' },
              }}>
              New Test Run
            </Button>
            <FormControl size="small">
              <Select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} displayEmpty
                endAdornment={<KeyboardArrowDownIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, mr: 1 }} />}
                sx={{ bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white', minWidth: 150, fontSize: 13,
                  '& .MuiSelect-icon': { display: 'none' }, '& fieldset': { border: 'none' },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                <MenuItem value="" sx={{ fontSize: 13 }}>(No template)</MenuItem>
                {templates.map(t => <MenuItem key={t.id} value={t.id} sx={{ fontSize: 13 }}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" size="small" startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
              onClick={() => setUploadOpen(true)}
              sx={{ borderRadius: '12px', borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)', fontSize: 13, px: 2,
                '&:hover': { borderColor: '#4ade80', color: '#4ade80', bgcolor: 'rgba(74,222,128,0.06)' } }}>Upload</Button>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
              onClick={handleDownloadExcel}
              sx={{ borderRadius: '12px', borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)', fontSize: 13, px: 2,
                '&:hover': { borderColor: '#4ade80', color: '#4ade80', bgcolor: 'rgba(74,222,128,0.06)' } }}>Export</Button>
          </Box>
        </Box>

        {/* Hero floating metric strip */}
        <Box sx={{ display: 'flex', gap: 2, mt: 4, flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
          {/* Active project label */}
          {selectedProjectId && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: 2, py: 1.25, borderRadius: '14px',
              bgcolor: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
              backdropFilter: 'blur(8px)',
            }}>
              <FolderOpenOutlinedIcon sx={{ color: '#4ade80', fontSize: 16 }} />
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 900, color: '#4ade80', lineHeight: 1, letterSpacing: 0.5 }}>
                  {projects.find(p => String(p.id) === selectedProjectId)?.name || 'Project'}
                </Typography>
                <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.8, mt: 0.25, fontWeight: 600 }}>Active Filter</Typography>
              </Box>
            </Box>
          )}
          {[
            { label: 'Total Cases', value: metrics.total_test_cases, color: '#4ade80' },
            { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 80 ? '#4ade80' : passRate >= 50 ? '#fde047' : '#f87171' },
            { label: 'Coverage', value: `${rd.coverage_pct || 0}%`, color: (rd.coverage_pct || 0) >= 80 ? '#4ade80' : '#fde047' },
            { label: 'Readiness Score', value: `${rd.score || 0}/100`, color: (rd.score || 0) >= 75 ? '#4ade80' : '#fde047' },
          ].map(m => (
            <Box key={m.label} sx={{
              px: 2.5, py: 1.25, borderRadius: '14px',
              bgcolor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(8px)',
            }}>
              <Typography sx={{ fontSize: 22, fontWeight: 900, color: m.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{m.value}</Typography>
              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.8, mt: 0.25, fontWeight: 600 }}>{m.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2, md: 6 }, mt: -3 }}>

        {/* ── ROW 1: STAT CARDS ──────────────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {statCards.map(c => (
            <Grid item xs={6} sm={4} md={2} key={c.label}><StatCard {...c} /></Grid>
          ))}
        </Grid>

        {/* ── ROW 2: RELEASE READINESS + CHECKLIST + MILESTONE ──── */}
        <Grid container spacing={3} sx={{ mb: 3 }}>

          {/* Release Readiness Gauge */}
          <Grid item xs={12} md={4}>
            <Card {...card}>
              <CardContent sx={{ p: 3 }}>
                <SectionTitle sub="Weighted: coverage × quality × critical tests">Release Readiness</SectionTitle>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <ReadinessGauge score={rd.score || 0} />
                </Box>
                <Divider sx={{ mb: 2, borderColor: 'rgba(34,80,56,0.08)' }} />
                {[
                  { label: 'Test Coverage', value: `${rd.coverage_pct || 0}%`, hint: `${rd.executed_cases || 0}/${rd.total_cases || 0} cases run`, color: rd.coverage_pct >= 80 ? '#16a34a' : rd.coverage_pct >= 50 ? '#d97706' : '#dc2626' },
                  { label: 'Overall Pass Rate', value: `${rd.pass_rate || 0}%`, hint: 'across all runs', color: rd.pass_rate >= 80 ? '#16a34a' : rd.pass_rate >= 50 ? '#d97706' : '#dc2626' },
                  { label: 'Critical Pass Rate', value: rd.critical_pass_rate != null ? `${rd.critical_pass_rate}%` : 'N/A', hint: 'P0 / Critical / High', color: (rd.critical_pass_rate || 0) >= 80 ? '#16a34a' : '#dc2626' },
                  { label: 'Untested Cases', value: rd.untested_count || 0, hint: 'need at least one run', color: (rd.untested_count || 0) === 0 ? '#16a34a' : '#dc2626' },
                ].map(item => (
                  <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25, '&:last-child': { mb: 0 } }}>
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary' }}>{item.label}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{item.hint}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 900, color: item.color }}>{item.value}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Pre-Release Checklist */}
          <Grid item xs={12} md={4}>
            <Card {...card}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <SectionTitle sub="Auto-generated from your test data">Pre-Release Checklist</SectionTitle>
                  <Chip label={`${checkDone}/${checkTotal}`} size="small"
                    sx={{ bgcolor: checkDone === checkTotal ? '#dcfce7' : '#fef3c7', color: checkDone === checkTotal ? '#15803d' : '#92400e', fontWeight: 800, fontSize: 11 }} />
                </Box>
                <Box sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', height: 7, borderRadius: 4, bgcolor: '#f1f5f9', overflow: 'hidden', mb: 0.75 }}>
                    <Box sx={{
                      width: `${(checkDone / checkTotal) * 100}%`,
                      background: checkDone === checkTotal
                        ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                        : 'linear-gradient(90deg, #d97706, #fbbf24)',
                      transition: 'width 0.5s', borderRadius: 4,
                    }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{checkDone} of {checkTotal} criteria met</Typography>
                </Box>
                {checklist.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1.5, '&:last-child': { mb: 0 } }}>
                    <Box sx={{
                      width: 20, height: 20, borderRadius: '6px', flexShrink: 0, mt: 0.05,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: item.done ? '#dcfce7' : item.warn ? '#fef3c7' : '#fee2e2',
                      border: `1.5px solid ${item.done ? '#86efac' : item.warn ? '#fde047' : '#fca5a5'}`,
                    }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 900, color: item.done ? '#16a34a' : item.warn ? '#d97706' : '#dc2626', lineHeight: 1 }}>
                        {item.done ? '✓' : item.warn ? '!' : '✗'}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12, color: item.done ? 'text.secondary' : 'text.primary', fontWeight: item.done ? 400 : 600,
                      textDecoration: item.done ? 'line-through' : 'none', lineHeight: 1.4 }}>
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Milestone Risk */}
          <Grid item xs={12} md={4}>
            <Card {...card}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <SectionTitle sub="Upcoming milestones with open test runs">Milestone Risk</SectionTitle>
                  <Button component={RouterLink} to="/milestones" size="small" endIcon={<ArrowForwardIosIcon sx={{ fontSize: 10 }} />}
                    sx={{ fontSize: 11, color: '#225038', fontWeight: 700, minWidth: 0 }}>View all</Button>
                </Box>
                {!dashboard?.milestones || dashboard.milestones.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 28, color: '#16a34a' }} />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>No upcoming milestones</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>All clear for release</Typography>
                  </Box>
                ) : dashboard.milestones.map(m => {
                  const daysLeft = Math.round(Number(m.days_until_due) || 0);
                  const hasRisk = Number(m.incomplete_runs) > 0;
                  const urgency = daysLeft <= 7 ? 'high' : daysLeft <= 14 ? 'med' : 'low';
                  const urgencyStyle = urgency === 'high' ? { bg: '#fff1f2', color: '#dc2626', border: '#fca5a5' }
                    : urgency === 'med' ? { bg: '#fffbeb', color: '#d97706', border: '#fde047' }
                    : { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' };
                  return (
                    <Box key={m.id} sx={{ mb: 2, p: 2, borderRadius: '12px', bgcolor: urgencyStyle.bg, border: '1.5px solid', borderColor: urgencyStyle.border, '&:last-child': { mb: 0 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', flex: 1 }} noWrap>{m.name}</Typography>
                        <Chip label={`${daysLeft}d`} size="small"
                          sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: urgencyStyle.color, color: 'white', borderRadius: '5px', ml: 1, flexShrink: 0 }} />
                      </Box>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                        {new Date(m.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {hasRisk && ` · ${m.incomplete_runs} incomplete run${m.incomplete_runs > 1 ? 's' : ''}`}
                      </Typography>
                      {hasRisk && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                          <WarningAmberIcon sx={{ fontSize: 12, color: urgencyStyle.color }} />
                          <Typography sx={{ fontSize: 10, fontWeight: 700, color: urgencyStyle.color }}>Incomplete test runs</Typography>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── ROW 3: TREND + VELOCITY ──────────────────────────────── */}
        <Grid container spacing={3} sx={{ mb: 3 }}>

          {/* Pass Rate Trend */}
          <Grid item xs={12} md={6}>
            <Card {...card}>
              <CardContent sx={{ p: 3 }}>
                <SectionTitle sub="Pass rate across last 8 test runs">Pass Rate Trend</SectionTitle>
                {!dashboard?.trend || dashboard.trend.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5, color: 'text.disabled' }}>
                    <TrendingUpIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
                    <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>No test runs with results yet</Typography>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 90, mb: 1 }}>
                      {dashboard.trend.map((run, i) => {
                        const total = parseInt(run.total, 10);
                        const rate = total > 0 ? Math.round((parseInt(run.passed, 10) / total) * 100) : 0;
                        const barColor = rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626';
                        return (
                          <Tooltip key={i} title={`${run.name}: ${rate}% (${run.passed}/${total})`} arrow>
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'default' }}>
                              <Box sx={{
                                width: '100%',
                                background: `linear-gradient(180deg, ${barColor} 0%, ${barColor}aa 100%)`,
                                borderRadius: '4px 4px 0 0',
                                height: `${Math.max(rate, 4)}%`,
                                transition: 'all 0.4s ease',
                                '&:hover': { opacity: 0.8 },
                              }} />
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Oldest</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Latest</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {[{ label: '>=80%', color: '#16a34a', bg: '#dcfce7' }, { label: '50-79%', color: '#d97706', bg: '#fef3c7' }, { label: '<50%', color: '#dc2626', bg: '#fee2e2' }].map(l => (
                        <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: l.color }} />
                          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{l.label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Execution Velocity */}
          <Grid item xs={12} md={6}>
            <Card {...card}>
              <CardContent sx={{ p: 3 }}>
                <SectionTitle sub="Test executions per day — last 14 days">Execution Velocity</SectionTitle>
                {!dashboard?.velocity || dashboard.velocity.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5, color: 'text.disabled' }}>
                    <SpeedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
                    <Typography sx={{ fontSize: 12 }}>No executions in the last 14 days</Typography>
                  </Box>
                ) : (
                  <>
                    <MiniBarChart data={dashboard.velocity} valueKey="executions" labelKey="exec_date" color="#225038" height={90} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>14 days ago</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Today</Typography>
                    </Box>
                    <Divider sx={{ my: 1.5, borderColor: 'rgba(34,80,56,0.08)' }} />
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      {[
                        { label: 'Total', value: dashboard.velocity.reduce((s, d) => s + parseInt(d.executions, 10), 0), color: '#225038' },
                        { label: 'Daily avg', value: Math.round(dashboard.velocity.reduce((s, d) => s + parseInt(d.executions, 10), 0) / 14), color: '#2563eb' },
                        { label: 'Active days', value: dashboard.velocity.length, color: '#7c3aed' },
                      ].map(m => (
                        <Box key={m.label}>
                          <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 500 }}>{m.label}</Typography>
                          <Typography sx={{ fontSize: 20, fontWeight: 900, color: m.color }}>{m.value}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── ROW 4: COVERAGE HEATMAP + TEST DEBT ──────────────────── */}
        <Grid container spacing={3} sx={{ mb: 3 }}>

          {/* Priority Coverage Heatmap */}
          <Grid item xs={12} md={6}>
            <Card {...card}>
              <CardContent sx={{ p: 3 }}>
                <SectionTitle sub="Coverage & pass rate by priority level">Coverage Heatmap</SectionTitle>
                <CoverageHeatmap data={dashboard?.coverage_by_priority || []} />
                <Divider sx={{ my: 2, borderColor: 'rgba(34,80,56,0.08)' }} />
                <Box sx={{ display: 'flex', gap: 2.5 }}>
                  {[{ label: 'Good ≥80%', bg: '#dcfce7', color: '#16a34a' }, { label: 'Risk 50–79%', bg: '#fef3c7', color: '#d97706' }, { label: 'Critical <50%', bg: '#fee2e2', color: '#dc2626' }].map(l => (
                    <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: l.color }} />
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{l.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Test Debt Monitor */}
          <Grid item xs={12} md={6}>
            <Card {...card}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <SectionTitle sub="Technical debt in your test suite">Test Debt Monitor</SectionTitle>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: 32, fontWeight: 900, color: debt.score >= 80 ? '#16a34a' : debt.score >= 50 ? '#d97706' : '#dc2626', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {debt.score ?? '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Health Score</Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', height: 10, borderRadius: 5, bgcolor: '#f1f5f9', overflow: 'hidden', mb: 0.75 }}>
                    <Box sx={{
                      width: `${debt.score || 0}%`,
                      background: debt.score >= 80 ? 'linear-gradient(90deg,#16a34a,#4ade80)' : debt.score >= 50 ? 'linear-gradient(90deg,#d97706,#fbbf24)' : 'linear-gradient(90deg,#dc2626,#f87171)',
                      borderRadius: 5, transition: 'width 0.6s',
                    }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                    {debt.score >= 80 ? 'Healthy test suite' : debt.score >= 50 ? 'Test debt accumulating' : 'High test debt — action needed'}
                  </Typography>
                </Box>
                {[
                  { label: 'Never Run', value: debt.never_run || 0, desc: 'test cases with no execution history', icon: '⏸', color: '#dc2626', bg: '#fff1f2' },
                  { label: 'Missing Expected Result', value: debt.no_expected_result || 0, desc: 'test cases with no expected outcome defined', icon: '📝', color: '#d97706', bg: '#fffbeb' },
                  { label: 'Draft Status', value: rd.draft_count || 0, desc: 'test cases still in Draft state', icon: '✏️', color: '#2563eb', bg: '#eff6ff' },
                ].map(item => (
                  <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.75, '&:last-child': { mb: 0 } }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                      {item.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary' }}>{item.label}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{item.desc}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 22, fontWeight: 900, color: item.value === 0 ? '#16a34a' : item.color, fontVariantNumeric: 'tabular-nums' }}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── ROW 5: FLAKY TESTS + TOP FAILING ─────────────────────── */}
        <Grid container spacing={3} sx={{ mb: 3 }}>

          {/* Flaky Tests */}
          <Grid item xs={12} md={6}>
            <Card {...card}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <SectionTitle sub="Tests alternating between pass & fail">Flaky Test Radar</SectionTitle>
                  {(dashboard?.flaky_tests || []).length > 0 && (
                    <Chip label={`${dashboard.flaky_tests.length} flaky`} size="small"
                      sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: 11 }} />
                  )}
                </Box>
                {!dashboard?.flaky_tests || dashboard.flaky_tests.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 28, color: '#16a34a' }} />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>No flaky tests detected</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>All tests have consistent results</Typography>
                  </Box>
                ) : dashboard.flaky_tests.map((tc, i) => {
                  const total = parseInt(tc.total_runs, 10);
                  const failRate = total > 0 ? Math.round((parseInt(tc.fail_count, 10) / total) * 100) : 0;
                  return (
                    <Box key={tc.id} sx={{ mb: 1.5, pb: 1.5, borderBottom: i < dashboard.flaky_tests.length - 1 ? '1px solid rgba(34,80,56,0.06)' : 'none' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary', flex: 1, mr: 1 }} noWrap>TC-{tc.id} {tc.title}</Typography>
                        <Chip label={`${failRate}% fail`} size="small"
                          sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#fee2e2', color: '#dc2626', borderRadius: '5px', flexShrink: 0 }} />
                      </Box>
                      <Box sx={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', bgcolor: '#f1f5f9' }}>
                        <Box sx={{ width: `${100 - failRate}%`, bgcolor: '#16a34a' }} />
                        <Box sx={{ width: `${failRate}%`, bgcolor: '#dc2626' }} />
                      </Box>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.5 }}>
                        {tc.pass_count} pass · {tc.fail_count} fail · {total} total runs
                      </Typography>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>

          {/* Top Failing Tests */}
          <Grid item xs={12} md={6}>
            <Card {...card}>
              <CardContent sx={{ p: 3 }}>
                <SectionTitle sub="Test cases with the most failures across all runs">Most Failing Tests</SectionTitle>
                {!dashboard?.top_failing || dashboard.top_failing.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 28, color: '#16a34a' }} />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>No failures recorded</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>Great quality so far!</Typography>
                  </Box>
                ) : dashboard.top_failing.map((tc, i) => {
                  const failRate = parseInt(tc.total_runs, 10) > 0 ? Math.round((parseInt(tc.fail_count, 10) / parseInt(tc.total_runs, 10)) * 100) : 0;
                  return (
                    <Box key={tc.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, pb: 1.5, borderBottom: i < dashboard.top_failing.length - 1 ? '1px solid rgba(34,80,56,0.06)' : 'none' }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#dc2626' }}>#{i + 1}</Typography>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          TC-{tc.id} {tc.title}
                        </Typography>
                        <Box sx={{ display: 'flex', height: 4, borderRadius: 2, bgcolor: '#f1f5f9', overflow: 'hidden', mt: 0.5, mb: 0.25 }}>
                          <Box sx={{ width: `${failRate}%`, bgcolor: '#dc2626', borderRadius: 2 }} />
                        </Box>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{tc.fail_count} failures · {tc.total_runs} runs</Typography>
                      </Box>
                      <Chip label={tc.priority} size="small"
                        sx={{ height: 18, fontSize: 10, fontWeight: 700,
                          bgcolor: ['Critical','P0'].includes(tc.priority) ? '#fee2e2' : ['High','P1'].includes(tc.priority) ? '#ffedd5' : '#f1f5f9',
                          color: ['Critical','P0'].includes(tc.priority) ? '#dc2626' : ['High','P1'].includes(tc.priority) ? '#ea580c' : '#64748b',
                          borderRadius: '5px', flexShrink: 0 }} />
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── ROW 6: AUTOMATION COVERAGE ─────────────────────────── */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Card {...card}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <SectionTitle sub="How many test cases are automated vs pending — across all projects">Automation Coverage</SectionTitle>
                    <Button size="small" onClick={refreshAutomation} sx={{ mt: 0.25, fontSize: 11, color: '#225038', fontWeight: 700, p: 0, minWidth: 0, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}>↻ Refresh</Button>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Automated', value: dashboard?.automation?.automated ?? 0, color: '#16a34a', bg: '#dcfce7' },
                      { label: 'Pending', value: dashboard?.automation?.pending ?? 0, color: '#dc2626', bg: '#fee2e2' },
                      { label: 'Has Tool', value: dashboard?.automation?.typed ?? 0, color: '#7c3aed', bg: '#f3e8ff' },
                    ].map(s => (
                      <Box key={s.label} sx={{ textAlign: 'center', px: 2.5, py: 1.25, borderRadius: '14px', bgcolor: s.bg, border: '1.5px solid', borderColor: s.bg }}>
                        <Typography sx={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</Typography>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 0.5, mt: 0.25 }}>{s.label}</Typography>
                      </Box>
                    ))}
                    <Box sx={{ textAlign: 'center', px: 2.5, py: 1.25, borderRadius: '14px', bgcolor: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
                      <Typography sx={{ fontSize: 26, fontWeight: 900, color: (dashboard?.automation?.pct ?? 0) >= 70 ? '#16a34a' : (dashboard?.automation?.pct ?? 0) >= 40 ? '#d97706' : '#dc2626', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                        {dashboard?.automation?.pct ?? 0}%
                      </Typography>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, mt: 0.25 }}>Coverage</Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', height: 12, borderRadius: 6, bgcolor: '#fee2e2', overflow: 'hidden', mb: 0.75 }}>
                    <Box sx={{
                      width: `${dashboard?.automation?.pct ?? 0}%`,
                      background: 'linear-gradient(90deg, #225038, #4ade80)',
                      borderRadius: 6, transition: 'width 0.8s ease',
                    }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✓ {dashboard?.automation?.automated ?? 0} automated</Typography>
                    <Typography sx={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>{dashboard?.automation?.pending ?? 0} pending ✗</Typography>
                  </Box>
                </Box>

                {(dashboard?.automation?.by_project || []).filter(p => parseInt(p.total, 10) > 0).length > 0 ? (
                  <>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.disabled', mb: 1.5 }}>Per Project</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
                      {(dashboard?.automation?.by_project || []).filter(p => parseInt(p.total, 10) > 0).map(p => {
                        const total = parseInt(p.total, 10);
                        const automated = parseInt(p.automated, 10);
                        const pending = total - automated;
                        const pct = total > 0 ? Math.round((automated / total) * 100) : 0;
                        const h = pct >= 70 ? { color: '#16a34a', bg: '#f0fdf4', border: '#86efac' }
                          : pct >= 40 ? { color: '#d97706', bg: '#fffbeb', border: '#fde047' }
                          : { color: '#dc2626', bg: '#fff1f2', border: '#fca5a5' };
                        return (
                          <Box key={p.id} sx={{ p: 2, borderRadius: '14px', border: '1.5px solid', borderColor: h.border, bgcolor: h.bg }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary', flex: 1 }} noWrap>{p.name}</Typography>
                              <Typography sx={{ fontSize: 16, fontWeight: 900, color: h.color, ml: 1, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{pct}%</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: '#fee2e2', mb: 1 }}>
                              <Box sx={{ width: `${pct}%`, background: `linear-gradient(90deg, ${h.color}cc, ${h.color})`, borderRadius: 4, transition: 'width 0.6s' }} />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography sx={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>✓ {automated}</Typography>
                              <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>{total} total</Typography>
                              <Typography sx={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>{pending} ✗</Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3, bgcolor: '#f8fafc', borderRadius: '14px' }}>
                    <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
                      Mark test cases as automated using the <strong>Is Automated</strong> checkbox when editing a test case.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── ROW 7: TEST RUNS + SIDEBAR ───────────────────────────── */}
        <Grid container spacing={3}>

          {/* Test Runs */}
          <Grid item xs={12} md={8}>
            <Card {...card} sx={{ ...card.sx, overflow: 'hidden' }}>
              <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(34,80,56,0.08)', background: 'linear-gradient(90deg, rgba(34,80,56,0.03) 0%, transparent 100%)' }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1a3d2b' }}>Test Runs</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                    {testRuns.length} total · {testRuns.filter(r => (r.computed_status || r.status) === 'Completed').length} completed
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <FormControl size="small">
                    <Select value={selectedRunId} onChange={e => setSelectedRunId(e.target.value)} displayEmpty
                      sx={{ fontSize: 13, borderRadius: '12px', bgcolor: '#f8fafc', minWidth: 200, '& fieldset': { borderColor: 'rgba(34,80,56,0.15)' } }}
                      renderValue={val => {
                        if (!val) return <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>All Runs</Typography>;
                        const r = testRuns.find(x => String(x.id) === val);
                        return <Typography sx={{ fontSize: 13 }}>{r?.name}</Typography>;
                      }}>
                      <MenuItem value=""><Typography sx={{ fontSize: 13 }}>All Runs</Typography></MenuItem>
                      {testRuns.map(r => (
                        <MenuItem key={r.id} value={String(r.id)}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <Typography sx={{ fontSize: 13, flex: 1 }}>{r.name}</Typography>
                            <StatusBadge status={r.computed_status || r.status || 'In Progress'} />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {selectedRunId && <Button size="small" onClick={() => setSelectedRunId('')} sx={{ fontSize: 12, color: 'text.secondary', minWidth: 0, px: 1 }}>Clear</Button>}
                  <Button component={RouterLink} to="/test-runs" size="small" endIcon={<ArrowForwardIosIcon sx={{ fontSize: 11 }} />}
                    sx={{ fontSize: 12, fontWeight: 700, color: '#225038', whiteSpace: 'nowrap' }}>View all</Button>
                </Box>
              </Box>
              {testRuns.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                    <PlayCircleOutlineIcon sx={{ fontSize: 36, color: '#cbd5e1' }} />
                  </Box>
                  <Typography fontWeight={700} color="text.secondary" sx={{ mb: 2 }}>No test runs yet</Typography>
                  <Button component={RouterLink} to="/test-runs" variant="contained" startIcon={<AddIcon />}
                    sx={{ borderRadius: '12px', fontWeight: 700, bgcolor: '#225038', '&:hover': { bgcolor: '#1a3d2b' }, boxShadow: '0 4px 14px rgba(34,80,56,0.3)' }}>
                    Create Test Run
                  </Button>
                </Box>
              ) : testRuns.slice(0, 8).map((run, idx) => {
                const rPass = Number(run.pass_count ?? 0), rFail = Number(run.fail_count ?? 0);
                const rSkip = Number(run.skip_count ?? 0), rTotal = Number(run.total_count ?? 0);
                const rExec = rPass + rFail + rSkip;
                const rRate = rExec > 0 ? Math.round((rPass / rExec) * 100) : 0;
                const rStatus = run.computed_status || run.status || 'In Progress';
                const isSelected = selectedRunId === String(run.id);
                return (
                  <Box key={run.id} onClick={() => setSelectedRunId(isSelected ? '' : String(run.id))}
                    sx={{ px: 3, py: 2.25, borderBottom: idx < Math.min(testRuns.length, 8) - 1 ? '1px solid rgba(34,80,56,0.06)' : 'none',
                      bgcolor: isSelected ? 'rgba(34,80,56,0.04)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #4ade80' : '3px solid transparent',
                      cursor: 'pointer', transition: 'background 0.15s',
                      '&:hover': { bgcolor: 'rgba(34,80,56,0.025)' },
                      display: 'flex', alignItems: 'center', gap: 2.5 }}>
                    <Box sx={{ minWidth: 0, flex: '1 1 160px' }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 0.25 }} noWrap>{run.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }}>
                        {new Date(run.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '0 0 120px', display: { xs: 'none', sm: 'block' } }}>
                      <Box sx={{ display: 'flex', height: 6, borderRadius: '10px', overflow: 'hidden', bgcolor: '#f1f5f9' }}>
                        {rTotal > 0 ? (
                          <>
                            <Box sx={{ width: `${(rPass/rTotal)*100}%`, bgcolor: '#16a34a' }} />
                            <Box sx={{ width: `${(rFail/rTotal)*100}%`, bgcolor: '#dc2626' }} />
                            <Box sx={{ width: `${(rSkip/rTotal)*100}%`, bgcolor: '#f59e0b' }} />
                          </>
                        ) : <Box sx={{ flex: 1, bgcolor: '#e2e8f0' }} />}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.75 }}>
                        <Typography sx={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✓{rPass}</Typography>
                        <Typography sx={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>✗{rFail}</Typography>
                        <Typography sx={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>⊘{rSkip}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: '0 0 52px', textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                      <Typography sx={{ fontSize: 16, fontWeight: 900, color: rExec === 0 ? '#94a3b8' : rRate >= 80 ? '#16a34a' : rRate >= 50 ? '#d97706' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                        {rExec === 0 ? '—' : `${rRate}%`}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '0 0 100px', display: { xs: 'none', sm: 'block' } }}><StatusBadge status={rStatus} /></Box>
                    <Button component={RouterLink} to={`/test-run/${run.id}`} size="small" variant={isSelected ? 'contained' : 'outlined'}
                      onClick={e => e.stopPropagation()}
                      sx={{ flexShrink: 0, fontSize: 12, fontWeight: 700, borderRadius: '10px', px: 1.75, py: 0.5, minWidth: 'unset',
                        ...(isSelected
                          ? { bgcolor: '#225038', borderColor: '#225038', color: 'white', '&:hover': { bgcolor: '#1a3d2b' } }
                          : { borderColor: 'rgba(34,80,56,0.2)', color: '#225038', '&:hover': { borderColor: '#225038', bgcolor: 'rgba(34,80,56,0.04)' } }) }}>
                      Open
                    </Button>
                  </Box>
                );
              })}
            </Card>
          </Grid>

          {/* RIGHT SIDEBAR */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

              {/* Pass Rate Ring */}
              <Card {...card}>
                <CardContent sx={{ p: 3 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#1a3d2b', mb: 2.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {selectedRun ? selectedRun.name : 'Overall Results'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2.5 }}>
                    <PassRateRing rate={passRate} />
                    <Box sx={{ flex: 1 }}>
                      {[
                        { label: 'Passed', count: passed, color: '#16a34a', bg: '#dcfce7' },
                        { label: 'Failed', count: failed, color: '#dc2626', bg: '#fee2e2' },
                        { label: 'Skipped', count: skipped, color: '#d97706', bg: '#fef3c7' },
                      ].map(item => (
                        <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 500 }}>{item.label}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ px: 1.25, py: 0.2, borderRadius: '6px', bgcolor: item.bg, minWidth: 32, textAlign: 'center' }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.count}</Typography>
                            </Box>
                            <Typography sx={{ fontSize: 11, color: 'text.disabled', minWidth: 32, textAlign: 'right' }}>
                              {executed > 0 ? `${Math.round((item.count/executed)*100)}%` : '—'}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  {executed > 0 && (
                    <Box sx={{ display: 'flex', height: 8, borderRadius: '10px', overflow: 'hidden', bgcolor: '#f1f5f9' }}>
                      <Box sx={{ width: `${(passed/executed)*100}%`, background: 'linear-gradient(90deg,#16a34a,#4ade80)', transition: 'width 0.5s' }} />
                      <Box sx={{ width: `${(failed/executed)*100}%`, bgcolor: '#dc2626' }} />
                      <Box sx={{ width: `${(skipped/executed)*100}%`, bgcolor: '#f59e0b' }} />
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Test Health by Status */}
              <Card {...card}>
                <CardContent sx={{ p: 2.5 }}>
                  <SectionTitle sub="Distribution of test case status">Test Health</SectionTitle>
                  {(dashboard?.health_by_status || []).map(item => {
                    const statusColor = item.status === 'Active' ? { color: '#16a34a', bg: '#dcfce7' }
                      : item.status === 'Deprecated' ? { color: '#dc2626', bg: '#fee2e2' }
                      : { color: '#2563eb', bg: '#dbeafe' };
                    const total = rd.total_cases || 1;
                    const pct = Math.round((parseInt(item.count, 10) / total) * 100);
                    return (
                      <Box key={item.status} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: statusColor.color }}>{item.status || 'Draft'}</Typography>
                          <Typography sx={{ fontSize: 12, fontWeight: 800, color: statusColor.color }}>{item.count} ({pct}%)</Typography>
                        </Box>
                        <Box sx={{ height: 6, borderRadius: 3, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                          <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: statusColor.color, borderRadius: 3, transition: 'width 0.5s' }} />
                        </Box>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card {...card}>
                <CardContent sx={{ p: 2.5 }}>
                  <SectionTitle>Quick Actions</SectionTitle>
                  {[
                    { label: 'View Test Cases', sub: `${metrics.total_test_cases} total`, href: '/test-cases', color: '#225038' },
                    { label: 'Manage Templates', sub: `${templates.length} templates`, href: '/templates', color: '#2563eb' },
                    { label: 'View Milestones', sub: 'Track releases', href: '/milestones', color: '#7c3aed' },
                    { label: 'Manage Projects', sub: 'Workspaces', href: '/projects', color: '#0891b2' },
                  ].map(action => (
                    <Box key={action.label} component={RouterLink} to={action.href}
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25, borderBottom: '1px solid rgba(34,80,56,0.06)', textDecoration: 'none',
                        '&:last-child': { borderBottom: 'none', pb: 0 }, '&:hover .qa-label': { color: action.color }, transition: 'all 0.15s' }}>
                      <Box>
                        <Typography className="qa-label" sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', transition: 'color 0.15s' }}>{action.label}</Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{action.sub}</Typography>
                      </Box>
                      <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: `${action.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowForwardIosIcon sx={{ fontSize: 11, color: action.color }} />
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <UploadMappingDialog open={uploadOpen} onClose={() => setUploadOpen(false)}
        onSuccess={() => { loadMetrics(selectedRunId || null); loadDashboard(); }}
        templateId={selectedTemplateId} />
    </Box>
  );
}
