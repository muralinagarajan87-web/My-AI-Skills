import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Grid,
  MenuItem, Chip, Divider, Avatar, LinearProgress, Select, FormControl,
  IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Badge
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { reportAPI, testRunAPI, templateAPI, workspaceAPI, uploadAPI } from '../services/api';
// uploadAPI used for downloadExcel
import UploadMappingDialog from '../components/UploadMappingDialog';

/* ── Pass-rate SVG Ring ─────────────────────────────────────────────── */
function PassRateRing({ rate }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const filled = (rate / 100) * circ;
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
        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, mt: 0.25 }}>
          Pass Rate
        </Typography>
      </Box>
    </Box>
  );
}

/* ── Stat Card ──────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color, bgColor }) {
  return (
    <Card elevation={0} sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: '14px',
      bgcolor: 'white', height: '100%',
      transition: 'box-shadow 0.18s, transform 0.18s',
      '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' }
    }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'text.disabled', mb: 0.75 }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1.1 }}>
              {value}
            </Typography>
            {sub && (
              <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.75, lineHeight: 1.3 }}>
                {sub}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: bgColor, width: 40, height: 40, borderRadius: '10px' }}>
            <Box sx={{ color, '& svg': { fontSize: 20 } }}>{icon}</Box>
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ── Status Badge ───────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const isComplete = status === 'Completed';
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1.25, py: 0.4, borderRadius: '6px',
      bgcolor: isComplete ? '#dcfce7' : '#fef9c3',
      border: '1px solid', borderColor: isComplete ? '#86efac' : '#fde047'
    }}>
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: isComplete ? '#16a34a' : '#ca8a04', flexShrink: 0 }} />
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: isComplete ? '#15803d' : '#92400e' }}>
        {status || 'In Progress'}
      </Typography>
    </Box>
  );
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [testRuns, setTestRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    loadWorkspace(); loadTemplates(); loadTestRuns();
  }, []);

  useEffect(() => { loadMetrics(selectedRunId || null); }, [selectedRunId]);

  const loadWorkspace = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.workspace_id) { const r = await workspaceAPI.get(user.workspace_id); setWorkspaceName(r.data.name); }
    } catch (e) { console.error(e); }
  };

  const loadTemplates = async () => {
    try { const r = await templateAPI.getAll(); setTemplates(r.data); } catch (e) { console.error(e); }
  };

  const loadMetrics = async (runId) => {
    try { const r = await reportAPI.getMetrics(runId); setMetrics(r.data); } catch (e) { console.error(e); }
  };

  const loadTestRuns = async () => {
    try { const r = await testRunAPI.getAll(); setTestRuns(r.data); } catch (e) { console.error(e); }
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
        <LinearProgress sx={{ width: 220, borderRadius: 2 }} />
        <Typography variant="body2" color="text.disabled">Loading dashboard...</Typography>
      </Box>
    );
  }

  const passed   = Number(metrics?.pass_fail_counts?.total_passed  || 0);
  const failed   = Number(metrics?.pass_fail_counts?.total_failed  || 0);
  const skipped  = Number(metrics?.pass_fail_counts?.total_skipped || 0);
  const executed = passed + failed + skipped;
  const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;
  const selectedRun = testRuns.find(r => String(r.id) === String(selectedRunId));

  return (
    <Box sx={{ bgcolor: '#f4f6f9', minHeight: '100vh', pb: 6 }}>

      {/* ── HERO HEADER ─────────────────────────────────────── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1a3d2b 0%, #225038 60%, #2d6a4f 100%)',
        px: { xs: 3, md: 6 }, pt: 4, pb: 5,
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative circles */}
        <Box sx={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
        <Box sx={{ position: 'absolute', bottom: -40, right: 120, width: 160, height: 160, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, position: 'relative' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#4ade80', boxShadow: '0 0 0 3px rgba(74,222,128,0.25)' }} />
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>
                {workspaceName || 'Loading...'}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 32, fontWeight: 800, color: 'white', lineHeight: 1.15, mb: 0.5 }}>
              Dashboard
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Test quality overview & execution status
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              component={RouterLink} to="/test-runs"
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                bgcolor: 'white', color: '#225038', fontWeight: 700, borderRadius: '10px',
                px: 2.5, fontSize: 13, boxShadow: 'none',
                '&:hover': { bgcolor: '#f0fdf4', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }
              }}
            >
              New Test Run
            </Button>

            <FormControl size="small">
              <Select
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
                displayEmpty
                endAdornment={<KeyboardArrowDownIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, mr: 1 }} />}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px', color: 'white', minWidth: 150, fontSize: 13,
                  '& .MuiSelect-icon': { display: 'none' },
                  '& fieldset': { border: 'none' }
                }}
              >
                <MenuItem value="" sx={{ fontSize: 13 }}>(No template)</MenuItem>
                {templates.map(t => <MenuItem key={t.id} value={t.id} sx={{ fontSize: 13 }}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>

            <Button variant="outlined" size="small" startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
              onClick={() => setUploadOpen(true)}
              sx={{ borderRadius: '10px', borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.85)',
                fontSize: 13, px: 2, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
              Upload
            </Button>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
              onClick={handleDownloadExcel}
              sx={{ borderRadius: '10px', borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.85)',
                fontSize: 13, px: 2, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
              Export
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2, md: 6 }, mt: -2 }}>

        {/* ── STAT CARDS ─────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Cases', value: metrics.total_test_cases, color: '#225038', bgColor: 'rgba(34,80,56,0.1)', icon: <AssignmentOutlinedIcon />, sub: 'in workspace' },
            { label: 'Passed', value: passed, color: '#16a34a', bgColor: '#dcfce7', icon: <CheckCircleOutlineIcon />, sub: executed > 0 ? `${Math.round((passed/executed)*100)}% of executed` : 'no results' },
            { label: 'Failed', value: failed, color: '#dc2626', bgColor: '#fee2e2', icon: <CancelOutlinedIcon />, sub: executed > 0 ? `${Math.round((failed/executed)*100)}% of executed` : 'no results' },
            { label: 'Skipped', value: skipped, color: '#d97706', bgColor: '#fef3c7', icon: <RemoveCircleOutlineIcon />, sub: executed > 0 ? `${Math.round((skipped/executed)*100)}% of executed` : 'no results' },
            { label: 'Test Runs', value: metrics.total_runs, color: '#2563eb', bgColor: '#dbeafe', icon: <PlayCircleOutlineIcon />, sub: `${metrics.completed_runs || 0} completed` },
            { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 80 ? '#16a34a' : passRate >= 50 ? '#d97706' : '#dc2626', bgColor: passRate >= 80 ? '#dcfce7' : passRate >= 50 ? '#fef3c7' : '#fee2e2', icon: <TrendingUpIcon />, sub: executed > 0 ? `${executed} executed` : 'no executions yet' },
          ].map(c => (
            <Grid item xs={6} sm={4} md={2} key={c.label}>
              <StatCard {...c} />
            </Grid>
          ))}
        </Grid>

        {/* ── MAIN GRID (runs list + sidebar) ────────────────── */}
        <Grid container spacing={3}>

          {/* LEFT: Test Runs ─────────────────────────────────── */}
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', bgcolor: 'white', overflow: 'hidden' }}>

              {/* Card Header */}
              <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary' }}>Test Runs</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                    {testRuns.length} total · {testRuns.filter(r => (r.computed_status || r.status) === 'Completed').length} completed
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  {/* Filter dropdown */}
                  <FormControl size="small">
                    <Select
                      value={selectedRunId}
                      onChange={e => setSelectedRunId(e.target.value)}
                      displayEmpty
                      sx={{ fontSize: 13, borderRadius: '10px', bgcolor: '#f8fafc', minWidth: 200, '& fieldset': { borderColor: '#e2e8f0' } }}
                      renderValue={val => {
                        if (!val) return <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>All Runs</Typography>;
                        const r = testRuns.find(x => String(x.id) === val);
                        return <Typography sx={{ fontSize: 13 }}>{r?.name}</Typography>;
                      }}
                    >
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
                  {selectedRunId && (
                    <Button size="small" onClick={() => setSelectedRunId('')}
                      sx={{ fontSize: 12, color: 'text.secondary', minWidth: 0, px: 1 }}>
                      Clear
                    </Button>
                  )}
                  <Button component={RouterLink} to="/test-runs" size="small" endIcon={<ArrowForwardIosIcon sx={{ fontSize: 11 }} />}
                    sx={{ fontSize: 12, fontWeight: 600, color: '#225038', whiteSpace: 'nowrap' }}>
                    View all
                  </Button>
                </Box>
              </Box>

              {/* Runs Table */}
              {testRuns.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <PlayCircleOutlineIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1.5 }} />
                  <Typography fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>No test runs yet</Typography>
                  <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>Create your first test run to start executing.</Typography>
                  <Button component={RouterLink} to="/test-runs" variant="contained" startIcon={<AddIcon />}
                    sx={{ borderRadius: '10px', fontWeight: 600, bgcolor: '#225038', '&:hover': { bgcolor: '#1a3d2b' } }}>
                    Create Test Run
                  </Button>
                </Box>
              ) : (
                <Box>
                  {testRuns.slice(0, 8).map((run, idx) => {
                    const rPass  = Number(run.pass_count  ?? 0);
                    const rFail  = Number(run.fail_count  ?? 0);
                    const rSkip  = Number(run.skip_count  ?? 0);
                    const rTotal = Number(run.total_count ?? 0);
                    const rPend  = rTotal - rPass - rFail - rSkip;
                    const rExec  = rPass + rFail + rSkip;
                    const rRate  = rExec > 0 ? Math.round((rPass / rExec) * 100) : 0;
                    const rStatus = run.computed_status || run.status || 'In Progress';
                    const isSelected = selectedRunId === String(run.id);

                    return (
                      <Box
                        key={run.id}
                        onClick={() => setSelectedRunId(isSelected ? '' : String(run.id))}
                        sx={{
                          px: 3, py: 2.25,
                          borderBottom: idx < Math.min(testRuns.length, 8) - 1 ? '1px solid' : 'none',
                          borderColor: 'divider',
                          bgcolor: isSelected ? 'rgba(34,80,56,0.03)' : 'transparent',
                          borderLeft: isSelected ? '3px solid #225038' : '3px solid transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          '&:hover': { bgcolor: '#f8fafc' },
                          display: 'flex', alignItems: 'center', gap: 2.5
                        }}
                      >
                        {/* Name + meta */}
                        <Box sx={{ minWidth: 0, flex: '1 1 160px' }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', mb: 0.25 }} noWrap>
                            {run.name}
                          </Typography>
                          {run.description && (
                            <Typography sx={{ fontSize: 12, color: 'text.disabled' }} noWrap>{run.description}</Typography>
                          )}
                          <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }}>
                            {new Date(run.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Typography>
                        </Box>

                        {/* Progress bar */}
                        <Box sx={{ flex: '0 0 120px', display: { xs: 'none', sm: 'block' } }}>
                          <Box sx={{ display: 'flex', height: 6, borderRadius: '10px', overflow: 'hidden', bgcolor: '#f1f5f9' }}>
                            {rTotal > 0 ? (
                              <>
                                <Box sx={{ width: `${(rPass/rTotal)*100}%`, bgcolor: '#16a34a' }} />
                                <Box sx={{ width: `${(rFail/rTotal)*100}%`, bgcolor: '#dc2626' }} />
                                <Box sx={{ width: `${(rSkip/rTotal)*100}%`, bgcolor: '#f59e0b' }} />
                              </>
                            ) : (
                              <Box sx={{ flex: 1, bgcolor: '#e2e8f0' }} />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1.5, mt: 0.75 }}>
                            <Typography sx={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓{rPass}</Typography>
                            <Typography sx={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>✗{rFail}</Typography>
                            <Typography sx={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>⊘{rSkip}</Typography>
                          </Box>
                        </Box>

                        {/* Rate */}
                        <Box sx={{ flex: '0 0 52px', textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                          <Typography sx={{
                            fontSize: 15, fontWeight: 800,
                            color: rExec === 0 ? '#94a3b8' : rRate >= 80 ? '#16a34a' : rRate >= 50 ? '#d97706' : '#dc2626'
                          }}>
                            {rExec === 0 ? '—' : `${rRate}%`}
                          </Typography>
                        </Box>

                        {/* Status */}
                        <Box sx={{ flex: '0 0 100px', display: { xs: 'none', sm: 'block' } }}>
                          <StatusBadge status={rStatus} />
                        </Box>

                        {/* Action */}
                        <Button
                          component={RouterLink} to={`/test-run/${run.id}`}
                          size="small"
                          variant={isSelected ? 'contained' : 'outlined'}
                          onClick={e => e.stopPropagation()}
                          sx={{
                            flexShrink: 0, fontSize: 12, fontWeight: 600, borderRadius: '8px',
                            px: 1.75, py: 0.5, minWidth: 'unset',
                            ...(isSelected
                              ? { bgcolor: '#225038', borderColor: '#225038', color: 'white', '&:hover': { bgcolor: '#1a3d2b' } }
                              : { borderColor: '#e2e8f0', color: 'text.secondary', '&:hover': { borderColor: '#225038', color: '#225038' } })
                          }}
                        >
                          Open
                        </Button>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Card>
          </Grid>

          {/* RIGHT: Sidebar ──────────────────────────────────── */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

              {/* Pass Rate Card */}
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', bgcolor: 'white' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 2.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
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
                            <Box sx={{
                              px: 1.25, py: 0.2, borderRadius: '6px', bgcolor: item.bg,
                              minWidth: 32, textAlign: 'center'
                            }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.count}</Typography>
                            </Box>
                            <Typography sx={{ fontSize: 11, color: 'text.disabled', minWidth: 32, textAlign: 'right' }}>
                              {executed > 0 ? `${Math.round((item.count/executed)*100)}%` : '—'}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  {/* Stacked bar */}
                  {executed > 0 && (
                    <Box sx={{ display: 'flex', height: 8, borderRadius: '10px', overflow: 'hidden', bgcolor: '#f1f5f9' }}>
                      <Box sx={{ width: `${(passed/executed)*100}%`, bgcolor: '#16a34a', transition: 'width 0.5s' }} />
                      <Box sx={{ width: `${(failed/executed)*100}%`, bgcolor: '#dc2626' }} />
                      <Box sx={{ width: `${(skipped/executed)*100}%`, bgcolor: '#f59e0b' }} />
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', bgcolor: 'white' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mb: 2 }}>
                    Quick Actions
                  </Typography>
                  {[
                    { label: 'View Test Cases', sub: `${metrics.total_test_cases} total`, href: '/test-cases', color: '#225038' },
                    { label: 'Manage Templates', sub: `${templates.length} templates`, href: '/templates', color: '#2563eb' },
                    { label: 'View Milestones', sub: 'Track releases', href: '/milestones', color: '#7c3aed' },
                    { label: 'Manage Projects', sub: 'Workspaces', href: '/projects', color: '#0891b2' },
                  ].map(action => (
                    <Box
                      key={action.label}
                      component={RouterLink} to={action.href}
                      sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        py: 1.25, borderBottom: '1px solid #f1f5f9',
                        textDecoration: 'none',
                        '&:last-child': { borderBottom: 'none', pb: 0 },
                        '&:hover .qa-label': { color: action.color },
                        transition: 'all 0.15s'
                      }}
                    >
                      <Box>
                        <Typography className="qa-label" sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', transition: 'color 0.15s' }}>
                          {action.label}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{action.sub}</Typography>
                      </Box>
                      <ArrowForwardIosIcon sx={{ fontSize: 11, color: '#cbd5e1' }} />
                    </Box>
                  ))}
                </CardContent>
              </Card>

              {/* Run health summary */}
              {testRuns.length > 0 && (
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', bgcolor: 'white' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mb: 2 }}>
                      Run Health
                    </Typography>
                    {[
                      { label: 'Total Runs', value: testRuns.length, color: '#64748b' },
                      { label: 'Completed', value: testRuns.filter(r => (r.computed_status || r.status) === 'Completed').length, color: '#16a34a' },
                      { label: 'In Progress', value: testRuns.filter(r => (r.computed_status || r.status) !== 'Completed').length, color: '#d97706' },
                    ].map(item => (
                      <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, '&:last-child': { mb: 0 } }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{item.label}</Typography>
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: item.color }}>{item.value}</Typography>
                      </Box>
                    ))}
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', height: 8, borderRadius: '10px', overflow: 'hidden', bgcolor: '#fef3c7' }}>
                      {testRuns.length > 0 && (
                        <Box sx={{
                          width: `${(testRuns.filter(r => (r.computed_status || r.status) === 'Completed').length / testRuns.length) * 100}%`,
                          bgcolor: '#16a34a', transition: 'width 0.5s'
                        }} />
                      )}
                    </Box>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.75 }}>
                      {testRuns.length > 0
                        ? `${Math.round((testRuns.filter(r => (r.computed_status || r.status) === 'Completed').length / testRuns.length) * 100)}% completion rate`
                        : 'No runs yet'}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      <UploadMappingDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => { loadMetrics(selectedRunId || null); }}
        templateId={selectedTemplateId}
      />
    </Box>
  );
}
