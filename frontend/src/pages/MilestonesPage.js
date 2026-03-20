import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Button, Card, CardContent, Grid, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  LinearProgress, Divider, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FlagIcon from '@mui/icons-material/Flag';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { milestoneAPI } from '../services/api';

export default function MilestonesPage() {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', refs: '', start_date: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const r = await milestoneAPI.getAll(); setMilestones(r.data); } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      setSaving(true);
      await milestoneAPI.create(form);
      setOpen(false);
      setForm({ name: '', description: '', refs: '', start_date: '', due_date: '' });
      load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this milestone?')) return;
    try { await milestoneAPI.delete(id); load(); } catch (e) { console.error(e); }
  };

  const getProgress = (m) => {
    const total = Number(m.total_tests || 0);
    const pending = Number(m.pending_count || 0);
    if (total === 0) return 0;
    return Math.round(((total - pending) / total) * 100);
  };

  const getPassRate = (m) => {
    const passed = Number(m.pass_count || 0);
    const total = Number(m.total_tests || 0);
    const pending = Number(m.pending_count || 0);
    const executed = total - pending;
    return executed > 0 ? Math.round((passed / executed) * 100) : 0;
  };

  const open_ms = milestones.filter(m => m.status === 'Open');
  const completed_ms = milestones.filter(m => m.status !== 'Open');

  const MilestoneCard = ({ m }) => {
    const progress = getProgress(m);
    const passRate = getPassRate(m);
    const totalRuns = Number(m.total_runs || 0);

    return (
      <Card elevation={0} onClick={() => navigate(`/milestone/${m.id}`)}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, cursor: 'pointer', mb: 1.5,
          '&:hover': { boxShadow: 3, borderColor: 'primary.main' }, transition: 'all 0.2s' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ mt: 0.25 }}>
              <FlagIcon sx={{ color: m.status === 'Open' ? 'primary.main' : 'success.main', fontSize: 20 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>{m.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Progress bar */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
                    <Box sx={{ flex: 1, height: 10, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.200' }}>
                      <Box sx={{ width: `${passRate}%`, height: '100%', bgcolor: 'success.main', transition: 'width 0.4s' }} />
                      <Box sx={{ width: `${Math.max(0, progress - passRate)}%`, height: '100%', bgcolor: 'grey.400', mt: '-100%', transition: 'width 0.4s' }} />
                    </Box>
                    <Typography variant="caption" fontWeight={700} sx={{ minWidth: 36, color: passRate >= 80 ? 'success.main' : passRate >= 50 ? 'warning.main' : 'error.main' }}>
                      {passRate}%
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={(e) => handleDelete(e, m.id)} sx={{ color: 'error.light' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {m.due_date ? `Due: ${new Date(m.due_date).toLocaleDateString()}` : 'No due date'}
                {totalRuns > 0 ? ` · ${totalRuns} test run${totalRuns !== 1 ? 's' : ''}` : ' · No test runs'}
              </Typography>
              {m.description && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }} noWrap>
                  {m.description}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Milestones</Typography>
          <Typography variant="body2" color="text.secondary">
            {open_ms.length} open · {completed_ms.length} completed
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ borderRadius: 2 }}>
          Add Milestone
        </Button>
      </Box>

      {/* Open */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>Open</Typography>
      {open_ms.length === 0 ? (
        <Card elevation={0} sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2.5, p: 4, textAlign: 'center', mb: 3 }}>
          <Typography color="text.secondary">No open milestones. Create one to group your test runs.</Typography>
        </Card>
      ) : (
        open_ms.map(m => <MilestoneCard key={m.id} m={m} />)
      )}

      <Divider sx={{ my: 3 }} />

      {/* Completed */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>Completed</Typography>
      {completed_ms.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No completed milestones yet.</Typography>
      ) : (
        completed_ms.map(m => <MilestoneCard key={m.id} m={m} />)
      )}

      {/* Create Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Add Milestone</Typography>
          <IconButton size="small" onClick={() => setOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField fullWidth required label="Name" value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Release v1.0, Sprint #4" size="small" sx={{ mb: 2 }} />
          <TextField fullWidth label="Description" value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            multiline rows={3} size="small" sx={{ mb: 2 }}
            helperText="Describe the purpose and goals of this milestone." />
          <TextField fullWidth label="References" value={form.refs}
            onChange={e => setForm(p => ({ ...p, refs: e.target.value }))}
            size="small" sx={{ mb: 2 }} placeholder="e.g. JIRA-123, TICKET-456" />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="Start Date" type="date" value={form.start_date}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Due Date" type="date" value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={saving || !form.name.trim()}>
            {saving ? 'Creating...' : 'Add Milestone'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
