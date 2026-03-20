import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container, Box, Typography, Button, Card, CardContent, Grid, Chip,
  Tab, Tabs, Divider, LinearProgress, TextField, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Paper, Alert
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import CloseIcon from '@mui/icons-material/Close';
import { milestoneAPI, testRunAPI } from '../services/api';

export default function MilestonePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [milestone, setMilestone] = useState(null);
  const [tab, setTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [allRuns, setAllRuns] = useState([]);
  const [addRunOpen, setAddRunOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState('');

  useEffect(() => { load(); loadAllRuns(); }, [id]);

  const load = async () => {
    try {
      const r = await milestoneAPI.get(id);
      setMilestone(r.data);
      setEditForm({
        name: r.data.name, description: r.data.description || '',
        refs: r.data.refs || '', start_date: r.data.start_date?.split('T')[0] || '',
        due_date: r.data.due_date?.split('T')[0] || '', status: r.data.status
      });
    } catch (e) { console.error(e); }
  };

  const loadAllRuns = async () => {
    try { const r = await testRunAPI.getAll(); setAllRuns(r.data); } catch (e) { console.error(e); }
  };

  const handleSaveEdit = async () => {
    try { await milestoneAPI.update(id, editForm); setEditOpen(false); load(); } catch (e) { console.error(e); }
  };

  const handleAddRun = async () => {
    if (!selectedRunId) return;
    try {
      // Update the test run to link to this milestone
      const run = allRuns.find(r => String(r.id) === String(selectedRunId));
      await testRunAPI.updateStatus(selectedRunId, run?.status || 'In Progress');
      // We need a dedicated endpoint. Use a workaround via direct API call
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/test-runs/${selectedRunId}/milestone`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ milestone_id: id })
      });
      setAddRunOpen(false);
      setSelectedRunId('');
      load();
    } catch (e) { console.error(e); }
  };

  if (!milestone) return <LinearProgress />;

  const runs = milestone.test_runs || [];
  const totalTests = runs.reduce((s, r) => s + Number(r.total_count || 0), 0);
  const totalPassed = runs.reduce((s, r) => s + Number(r.pass_count || 0), 0);
  const totalFailed = runs.reduce((s, r) => s + Number(r.fail_count || 0), 0);
  const totalSkipped = runs.reduce((s, r) => s + Number(r.skip_count || 0), 0);
  const totalPending = runs.reduce((s, r) => s + Number(r.pending_count || 0), 0);
  const executed = totalTests - totalPending;
  const passRate = executed > 0 ? Math.round((totalPassed / executed) * 100) : 0;
  const progress = totalTests > 0 ? Math.round((executed / totalTests) * 100) : 0;
  const completedRuns = runs.filter(r => r.computed_status === 'Completed').length;

  const unlinkedRuns = allRuns.filter(r => !r.milestone_id || String(r.milestone_id) !== String(id));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/milestones')} sx={{ color: 'text.secondary' }}>
          Milestones
        </Button>
        <Typography color="text.disabled">/</Typography>
        <Typography variant="body2" color="text.secondary">{milestone.name}</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlagIcon sx={{ color: 'white', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>{milestone.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip label={milestone.status} size="small" color={milestone.status === 'Open' ? 'primary' : 'success'} />
              {milestone.due_date && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  Due: {new Date(milestone.due_date).toLocaleDateString()}
                </Typography>
              )}
              {milestone.refs && (
                <Chip label={milestone.refs} size="small" variant="outlined" sx={{ fontSize: 10 }} />
              )}
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<EditIcon />} variant="outlined" size="small" onClick={() => setEditOpen(true)} sx={{ borderRadius: 2 }}>
            Edit
          </Button>
          <Button variant="contained" size="small" onClick={() => setAddRunOpen(true)} sx={{ borderRadius: 2 }}>
            + Add Test Run
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab label="Overview" />
        <Tab label={`Test Runs (${runs.length})`} />
        <Tab label="Report" />
      </Tabs>

      {/* Tab 0: Overview */}
      {tab === 0 && (
        <Box>
          {milestone.description && (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Description</Typography>
                <Typography variant="body2">{milestone.description}</Typography>
              </CardContent>
            </Card>
          )}

          {/* Summary stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Test Runs', value: runs.length, sub: `${completedRuns} completed`, color: '#1565c0' },
              { label: 'Total Tests', value: totalTests, sub: `${executed} executed`, color: '#225038' },
              { label: 'Passed', value: totalPassed, sub: executed > 0 ? `${Math.round((totalPassed/executed)*100)}%` : '—', color: '#2e7d32' },
              { label: 'Failed', value: totalFailed, sub: executed > 0 ? `${Math.round((totalFailed/executed)*100)}%` : '—', color: '#c62828' },
              { label: 'Pass Rate', value: `${passRate}%`, sub: `${progress}% executed`, color: passRate >= 80 ? '#2e7d32' : passRate >= 50 ? '#e65100' : '#c62828' },
            ].map(stat => (
              <Grid item xs={6} sm={4} md={2.4} key={stat.label}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, bgcolor: stat.color }} />
                  <CardContent sx={{ pl: 2.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'text.disabled', letterSpacing: 0.5 }}>{stat.label}</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: stat.color, lineHeight: 1.2 }}>{stat.value}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{stat.sub}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Progress */}
          {totalTests > 0 && (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>Milestone Progress</Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ color: passRate >= 80 ? 'success.main' : passRate >= 50 ? 'warning.main' : 'error.main' }}>
                    {passRate}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', height: 16, borderRadius: 2, overflow: 'hidden', mb: 1.5 }}>
                  <Box sx={{ width: `${executed > 0 ? (totalPassed/totalTests)*100 : 0}%`, bgcolor: '#2e7d32', transition: 'width 0.5s' }} />
                  <Box sx={{ width: `${executed > 0 ? (totalFailed/totalTests)*100 : 0}%`, bgcolor: '#c62828' }} />
                  <Box sx={{ width: `${executed > 0 ? (totalSkipped/totalTests)*100 : 0}%`, bgcolor: '#e65100' }} />
                  <Box sx={{ flex: 1, bgcolor: '#e0e0e0' }} />
                </Box>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Passed', count: totalPassed, color: '#2e7d32' },
                    { label: 'Failed', count: totalFailed, color: '#c62828' },
                    { label: 'Skipped', count: totalSkipped, color: '#e65100' },
                    { label: 'Pending', count: totalPending, color: '#9e9e9e' },
                  ].map(item => (
                    <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                      <Typography variant="caption" fontWeight={600} sx={{ color: item.color }}>{item.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.count}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Tab 1: Test Runs */}
      {tab === 1 && (
        <Box>
          {runs.length === 0 ? (
            <Card elevation={0} sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2.5, p: 5, textAlign: 'center' }}>
              <PlayCircleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No test runs linked to this milestone yet.</Typography>
              <Button variant="contained" sx={{ mt: 2, borderRadius: 2 }} onClick={() => setAddRunOpen(true)}>
                + Add Test Run
              </Button>
            </Card>
          ) : (
            runs.map(run => {
              const rTotal = Number(run.total_count || 0);
              const rPass = Number(run.pass_count || 0);
              const rFail = Number(run.fail_count || 0);
              const rSkip = Number(run.skip_count || 0);
              const rRate = rTotal > 0 ? Math.round((rPass / (rTotal - Number(run.pending_count || 0))) * 100) : 0;
              return (
                <Card key={run.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, mb: 1.5,
                  '&:hover': { boxShadow: 2 }, transition: 'box-shadow 0.2s' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight={700}>{run.name}</Typography>
                          <Chip label={run.computed_status || 'In Progress'} size="small"
                            color={run.computed_status === 'Completed' ? 'success' : 'warning'} />
                        </Box>
                        {rTotal > 0 && (
                          <>
                            <Box sx={{ display: 'flex', height: 6, borderRadius: 1, overflow: 'hidden', mb: 1, maxWidth: 400 }}>
                              <Box sx={{ width: `${(rPass/rTotal)*100}%`, bgcolor: '#2e7d32' }} />
                              <Box sx={{ width: `${(rFail/rTotal)*100}%`, bgcolor: '#c62828' }} />
                              <Box sx={{ width: `${(rSkip/rTotal)*100}%`, bgcolor: '#e65100' }} />
                              <Box sx={{ flex: 1, bgcolor: '#e0e0e0' }} />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600 }}>&#10003; {rPass}</Typography>
                              <Typography variant="caption" sx={{ color: '#c62828', fontWeight: 600 }}>&#10007; {rFail}</Typography>
                              <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 600 }}>&#8856; {rSkip}</Typography>
                              <Typography variant="caption" color="text.secondary">· {rTotal} total</Typography>
                            </Box>
                          </>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {rTotal > 0 && (
                          <Typography variant="h6" fontWeight={800}
                            sx={{ color: rRate >= 80 ? '#2e7d32' : rRate >= 50 ? '#e65100' : '#c62828' }}>
                            {rRate}%
                          </Typography>
                        )}
                        <Button component={RouterLink} to={`/test-run/${run.id}`} size="small" variant="outlined" sx={{ borderRadius: 2 }}>
                          Open
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      )}

      {/* Tab 2: Report */}
      {tab === 2 && (
        <Box>
          {totalTests === 0 ? (
            <Alert severity="info">No test results yet. Add test runs and execute test cases to see the report.</Alert>
          ) : (
            <>
              {/* Pass Rate Summary */}
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Overall Pass Rate</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{ width: 100, height: 100, borderRadius: '50%', border: '8px solid',
                      borderColor: passRate >= 80 ? 'success.main' : passRate >= 50 ? 'warning.main' : 'error.main',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography variant="h5" fontWeight={800}
                        sx={{ color: passRate >= 80 ? 'success.main' : passRate >= 50 ? 'warning.main' : 'error.main' }}>
                        {passRate}%
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      {[
                        { label: 'Passed', count: totalPassed, total: executed, color: '#2e7d32', icon: <CheckCircleIcon sx={{ fontSize: 16, color: '#2e7d32' }} /> },
                        { label: 'Failed', count: totalFailed, total: executed, color: '#c62828', icon: <CancelIcon sx={{ fontSize: 16, color: '#c62828' }} /> },
                        { label: 'Skipped', count: totalSkipped, total: executed, color: '#e65100', icon: null },
                        { label: 'Not Executed', count: totalPending, total: totalTests, color: '#9e9e9e', icon: null },
                      ].map(item => (
                        <Box key={item.label} sx={{ mb: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {item.icon}
                              <Typography variant="body2" fontWeight={600}>{item.label}</Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={700} sx={{ color: item.color }}>
                              {item.count} ({item.total > 0 ? Math.round((item.count/item.total)*100) : 0}%)
                            </Typography>
                          </Box>
                          <LinearProgress variant="determinate"
                            value={item.total > 0 ? (item.count/item.total)*100 : 0}
                            sx={{ height: 8, borderRadius: 1,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 1 }
                            }} />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Per-run report */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Results by Test Run</Typography>
              {runs.map(run => {
                const rTotal = Number(run.total_count || 0);
                const rPass = Number(run.pass_count || 0);
                const rFail = Number(run.fail_count || 0);
                const rSkip = Number(run.skip_count || 0);
                const rPending = Number(run.pending_count || 0);
                const rExecuted = rTotal - rPending;
                const rRate = rExecuted > 0 ? Math.round((rPass/rExecuted)*100) : 0;
                return (
                  <Card key={run.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, mb: 2 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight={700}>{run.name}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Chip label={run.computed_status || 'In Progress'} size="small"
                            color={run.computed_status === 'Completed' ? 'success' : 'warning'} />
                          <Typography variant="subtitle1" fontWeight={800}
                            sx={{ color: rRate >= 80 ? '#2e7d32' : rRate >= 50 ? '#e65100' : '#c62828' }}>
                            {rRate}%
                          </Typography>
                        </Box>
                      </Box>
                      {rTotal > 0 ? (
                        <>
                          <Box sx={{ display: 'flex', height: 10, borderRadius: 1.5, overflow: 'hidden', mb: 1 }}>
                            <Box sx={{ width: `${(rPass/rTotal)*100}%`, bgcolor: '#2e7d32' }} />
                            <Box sx={{ width: `${(rFail/rTotal)*100}%`, bgcolor: '#c62828' }} />
                            <Box sx={{ width: `${(rSkip/rTotal)*100}%`, bgcolor: '#e65100' }} />
                            <Box sx={{ flex: 1, bgcolor: '#e0e0e0' }} />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 3 }}>
                            <Typography variant="caption" sx={{ color: '#2e7d32' }}>&#10003; Pass: {rPass}</Typography>
                            <Typography variant="caption" sx={{ color: '#c62828' }}>&#10007; Fail: {rFail}</Typography>
                            <Typography variant="caption" sx={{ color: '#e65100' }}>&#8856; Skip: {rSkip}</Typography>
                            <Typography variant="caption" color="text.disabled">&#9675; Pending: {rPending}</Typography>
                          </Box>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.disabled">No results yet</Typography>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </Box>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Edit Milestone</Typography>
          <IconButton size="small" onClick={() => setEditOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField fullWidth label="Name" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} size="small" sx={{ mb: 2 }} />
          <TextField fullWidth label="Description" value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} multiline rows={2} size="small" sx={{ mb: 2 }} />
          <TextField fullWidth label="References" value={editForm.refs || ''} onChange={e => setEditForm(p => ({ ...p, refs: e.target.value }))} size="small" sx={{ mb: 2 }} />
          <TextField select fullWidth label="Status" value={editForm.status || 'Open'} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} size="small" sx={{ mb: 2 }}>
            <MenuItem value="Open">Open</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
          </TextField>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="Start Date" type="date" value={editForm.start_date || ''} onChange={e => setEditForm(p => ({ ...p, start_date: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Due Date" type="date" value={editForm.due_date || ''} onChange={e => setEditForm(p => ({ ...p, due_date: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', px: 3, py: 2 }}>
          <Button onClick={() => setEditOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Add Test Run Dialog */}
      <Dialog open={addRunOpen} onClose={() => setAddRunOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Add Test Run to Milestone</Typography>
          <IconButton size="small" onClick={() => setAddRunOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField select fullWidth label="Select Test Run" value={selectedRunId} onChange={e => setSelectedRunId(e.target.value)} size="small">
            <MenuItem value="">Choose a test run...</MenuItem>
            {unlinkedRuns.map(r => (
              <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
            ))}
          </TextField>
          {unlinkedRuns.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              All test runs are already linked to milestones.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', px: 3, py: 2 }}>
          <Button onClick={() => setAddRunOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleAddRun} variant="contained" disabled={!selectedRunId}>Add to Milestone</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
