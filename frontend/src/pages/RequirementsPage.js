import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Container, Typography, Button, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel, Select,
  MenuItem, IconButton, Tooltip, Tabs, Tab, Grid, CircularProgress,
  Snackbar, Alert, Divider, Badge, Checkbox, FormControlLabel, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ChecklistIcon from '@mui/icons-material/Checklist';
import SearchIcon from '@mui/icons-material/Search';
import { requirementAPI, testCaseAPI } from '../services/api';

const PRIORITY_STYLES = {
  critical: { bg: '#fee2e2', color: '#dc2626' },
  high:     { bg: '#ffedd5', color: '#ea580c' },
  medium:   { bg: '#fef9c3', color: '#ca8a04' },
  low:      { bg: '#dcfce7', color: '#16a34a' },
};

const STATUS_STYLES = {
  draft:    { bg: '#f1f5f9', color: '#64748b' },
  active:   { bg: '#dcfce7', color: '#15803d' },
  approved: { bg: '#dbeafe', color: '#2563eb' },
  obsolete: { bg: '#fee2e2', color: '#dc2626' },
};

function PriorityChip({ priority }) {
  const s = PRIORITY_STYLES[priority?.toLowerCase()] || { bg: '#f1f5f9', color: '#64748b' };
  return <Chip label={priority || '—'} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, height: 22, borderRadius: '6px', textTransform: 'capitalize' }} />;
}

function StatusChipReq({ status }) {
  const s = STATUS_STYLES[status?.toLowerCase()] || { bg: '#f1f5f9', color: '#64748b' };
  return <Chip label={status || '—'} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, height: 22, borderRadius: '6px', textTransform: 'capitalize' }} />;
}

const EMPTY_REQ = { title: '', description: '', ref_id: '', priority: 'medium', status: 'draft', external_url: '' };

function ReqFormDialog({ open, onClose, onSave, initial, title }) {
  const [form, setForm] = useState(initial || EMPTY_REQ);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial || EMPTY_REQ); }, [initial, open]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', pb: 2 }}>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={8}>
            <TextField fullWidth required label="Title" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth label="Ref ID" value={form.ref_id || ''}
              onChange={e => setForm(p => ({ ...p, ref_id: e.target.value }))}
              placeholder="REQ-001"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={3} label="Description" value={form.description || ''}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select value={form.priority || 'medium'} label="Priority"
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                sx={{ borderRadius: '10px' }}>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={form.status || 'draft'} label="Status"
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                sx={{ borderRadius: '10px' }}>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="obsolete">Obsolete</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="External URL" value={form.external_url || ''}
              onChange={e => setForm(p => ({ ...p, external_url: e.target.value }))}
              placeholder="https://jira.example.com/browse/REQ-001"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '10px' }}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.title.trim()}
          sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#1a3d2b' } }}>
          {saving ? 'Saving...' : 'Save Requirement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function LinkTCDialog({ open, onClose, requirement, testCases, onLinked }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const linked = useMemo(() => {
    if (!requirement) return [];
    return (requirement.test_case_ids || []).map(id => String(id));
  }, [requirement]);

  useEffect(() => {
    if (open) setSelected([...linked]);
  }, [open, linked.join(',')]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? testCases : testCases.filter(tc => tc.title?.toLowerCase().includes(q) || String(tc.id).includes(q));
  }, [testCases, search]);

  const toggle = (id) => {
    const s = String(id);
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSave = async () => {
    if (!requirement) return;
    setSaving(true);
    try {
      await requirementAPI.linkTestCases(requirement.id, selected.map(Number));
      onLinked();
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', pb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Link Test Cases</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{requirement?.title}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField fullWidth size="small" placeholder="Search test cases..."
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment> }}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '9px' } }}
        />
        <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
          {filtered.map(tc => (
            <Box key={tc.id} onClick={() => toggle(tc.id)}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: '8px', cursor: 'pointer',
                bgcolor: selected.includes(String(tc.id)) ? 'rgba(34,80,56,0.06)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(34,80,56,0.04)' } }}>
              <Checkbox size="small" checked={selected.includes(String(tc.id))}
                sx={{ p: 0, '&.Mui-checked': { color: '#225038' } }} />
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', fontFamily: 'monospace' }}>TC-{tc.id}</Typography>
                <Typography sx={{ fontSize: 13, color: '#1e293b' }}>{tc.title}</Typography>
              </Box>
              {tc.priority && <Chip label={tc.priority} size="small" sx={{ ml: 'auto', height: 18, fontSize: 10, fontWeight: 700, borderRadius: '5px', bgcolor: '#f1f5f9', color: '#64748b' }} />}
            </Box>
          ))}
        </Box>
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 1.5 }}>
          {selected.length} test case{selected.length !== 1 ? 's' : ''} selected
        </Typography>
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '10px' }}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}
          sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#1a3d2b' } }}>
          {saving ? 'Saving...' : 'Save Links'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── Coverage Matrix ────────────────────────────────────────────── */
function CoverageMatrix({ requirements, testCases }) {
  if (requirements.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <ChecklistIcon sx={{ fontSize: 48, color: '#e2e8f0', mb: 2, display: 'block', mx: 'auto' }} />
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>No requirements yet. Add requirements and link test cases to see the matrix.</Typography>
      </Box>
    );
  }

  const tcMap = Object.fromEntries(testCases.map(tc => [tc.id, tc]));

  const handleExport = () => {
    const rows = [['Requirement', 'Ref ID', 'Priority', 'Test Cases', 'Coverage %']];
    requirements.forEach(req => {
      const linked = req.test_case_ids || [];
      const pct = linked.length > 0 ? Math.round((linked.filter(id => tcMap[id]?.last_result === 'Pass').length / linked.length) * 100) : 0;
      rows.push([req.title, req.ref_id || '', req.priority || '', linked.length, pct + '%']);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'requirements-coverage.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
          Requirements Traceability Matrix
        </Typography>
        <Button size="small" startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={handleExport}
          sx={{ borderRadius: '8px', color: '#225038', border: '1px solid #86efac', bgcolor: '#f0fdf4', fontSize: 12, fontWeight: 700, '&:hover': { bgcolor: '#dcfce7' } }}>
          Export CSV
        </Button>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'auto' }}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#64748b', borderBottom: '2px solid #e2e8f0', width: 80 }}>Ref ID</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Requirement</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#64748b', borderBottom: '2px solid #e2e8f0', width: 90 }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Linked Test Cases</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#64748b', borderBottom: '2px solid #e2e8f0', width: 100 }}>Coverage</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requirements.map(req => {
              const linked = (req.test_case_ids || []).map(id => tcMap[id]).filter(Boolean);
              const passed = linked.filter(tc => tc.last_result === 'Pass').length;
              const failed = linked.filter(tc => tc.last_result === 'Fail').length;
              const notRun = linked.length - passed - failed;
              const coveragePct = linked.length > 0 ? Math.round((passed / linked.length) * 100) : 0;
              return (
                <TableRow key={req.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                      {req.ref_id || `REQ-${String(req.id).padStart(3, '0')}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{req.title}</Typography>
                    {req.description && (
                      <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                        {req.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell><PriorityChip priority={req.priority} /></TableCell>
                  <TableCell>
                    {linked.length === 0 ? (
                      <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>No test cases linked</Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {linked.slice(0, 6).map(tc => {
                          const result = tc.last_result;
                          const dotColor = result === 'Pass' ? '#16a34a' : result === 'Fail' ? '#dc2626' : '#94a3b8';
                          const dotBg = result === 'Pass' ? '#dcfce7' : result === 'Fail' ? '#fee2e2' : '#f1f5f9';
                          return (
                            <Tooltip key={tc.id} title={`TC-${tc.id}: ${tc.title} · ${result || 'Not run'}`} arrow>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: '6px', bgcolor: dotBg, cursor: 'default' }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dotColor }} />
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: dotColor, fontFamily: 'monospace' }}>TC-{tc.id}</Typography>
                              </Box>
                            </Tooltip>
                          );
                        })}
                        {linked.length > 6 && (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled', alignSelf: 'center' }}>+{linked.length - 6} more</Typography>
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {linked.length === 0 ? (
                      <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>
                    ) : (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: coveragePct >= 80 ? '#16a34a' : coveragePct >= 50 ? '#d97706' : '#dc2626' }}>
                            {coveragePct}%
                          </Typography>
                        </Box>
                        <Box sx={{ height: 6, borderRadius: '4px', bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                          <Box sx={{ width: `${coveragePct}%`, height: '100%', bgcolor: coveragePct >= 80 ? '#16a34a' : coveragePct >= 50 ? '#d97706' : '#dc2626', borderRadius: '4px', transition: 'width 0.4s' }} />
                        </Box>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.25 }}>
                          {passed}✓ {failed}✗ {notRun}⊘
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

/* ─── MAIN ─────────────────────────────────────────────────────────── */
export default function RequirementsPage() {
  const [tab, setTab] = useState(0);
  const [requirements, setRequirements] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editReq, setEditReq] = useState(null);
  const [linkReq, setLinkReq] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rRes, tcRes] = await Promise.allSettled([requirementAPI.getAll(), testCaseAPI.getAll()]);
      if (rRes.status === 'fulfilled') setRequirements(rRes.value.data || []);
      if (tcRes.status === 'fulfilled') setTestCases(tcRes.value.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreate = async (form) => {
    await requirementAPI.create(form);
    loadAll();
    showSnack('Requirement created');
  };

  const handleEdit = async (form) => {
    await requirementAPI.update(editReq.id, form);
    loadAll();
    showSnack('Requirement updated');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this requirement?')) return;
    await requirementAPI.delete(id);
    loadAll();
    showSnack('Requirement deleted');
  };

  const showSnack = (msg, severity = 'success') => setSnackbar({ open: true, message: msg, severity });

  return (
    <Box sx={{ bgcolor: '#f4f6f9', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a3d2b 0%, #225038 60%, #2d6a4f 100%)', px: { xs: 3, md: 5 }, pt: 3.5, pb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <ChecklistIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Traceability
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1.2, mb: 0.5 }}>Requirements</Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {requirements.length} requirements · Track coverage and link test cases
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
            sx={{ bgcolor: 'white', color: '#225038', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: '#f0fdf4' } }}>
            New Requirement
          </Button>
        </Box>
      </Box>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13, color: '#64748b' },
          '& .Mui-selected': { color: '#225038' },
          '& .MuiTabs-indicator': { bgcolor: '#225038' } }}>
          <Tab label="Requirements" />
          <Tab label="Coverage Matrix" />
        </Tabs>

        {tab === 0 && (
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
            <TableContainer>
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    {['Ref ID', 'Title', 'Priority', 'Status', 'Test Cases', 'Coverage', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#64748b', borderBottom: '2px solid #e2e8f0', py: 1.5, whiteSpace: 'nowrap' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={28} sx={{ color: '#225038' }} /></TableCell></TableRow>
                  ) : requirements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                        <ChecklistIcon sx={{ fontSize: 40, color: '#e2e8f0', mb: 1, display: 'block', mx: 'auto' }} />
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary', mb: 1 }}>No requirements yet</Typography>
                        <Button startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ color: '#225038', fontSize: 12 }}>
                          Create first requirement
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : requirements.map(req => {
                    const linked = (req.test_case_ids || []).length;
                    const tcList = (req.test_case_ids || []).map(id => testCases.find(tc => String(tc.id) === String(id))).filter(Boolean);
                    const passed = tcList.filter(tc => tc.last_result === 'Pass').length;
                    const cov = linked > 0 ? Math.round((passed / linked) * 100) : 0;
                    return (
                      <TableRow key={req.id} sx={{ '&:hover': { bgcolor: '#f8fffe' } }}>
                        <TableCell>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                            {req.ref_id || `REQ-${String(req.id).padStart(3, '0')}`}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {req.title}
                          </Typography>
                          {req.external_url && (
                            <Box component="a" href={req.external_url} target="_blank" rel="noopener"
                              sx={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                              External link
                            </Box>
                          )}
                        </TableCell>
                        <TableCell><PriorityChip priority={req.priority} /></TableCell>
                        <TableCell><StatusChipReq status={req.status} /></TableCell>
                        <TableCell>
                          <Badge badgeContent={linked} color="primary" sx={{ '& .MuiBadge-badge': { bgcolor: '#225038', fontSize: 10, fontWeight: 700 } }}>
                            <Chip label={linked === 0 ? 'None linked' : `${linked} TC${linked !== 1 ? 's' : ''}`} size="small"
                              sx={{ bgcolor: linked > 0 ? '#f0fdf4' : '#f1f5f9', color: linked > 0 ? '#15803d' : '#64748b', fontWeight: 700, fontSize: 11, height: 22, borderRadius: '6px' }} />
                          </Badge>
                        </TableCell>
                        <TableCell sx={{ minWidth: 100 }}>
                          {linked === 0 ? (
                            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>
                          ) : (
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: cov >= 80 ? '#16a34a' : cov >= 50 ? '#d97706' : '#dc2626' }}>{cov}%</Typography>
                              </Box>
                              <Box sx={{ height: 5, borderRadius: 3, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                                <Box sx={{ width: `${cov}%`, height: '100%', bgcolor: cov >= 80 ? '#16a34a' : cov >= 50 ? '#d97706' : '#dc2626', borderRadius: 3, transition: 'width 0.4s' }} />
                              </Box>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Link Test Cases">
                              <IconButton size="small" onClick={() => setLinkReq(req)}
                                sx={{ color: '#2563eb', '&:hover': { bgcolor: '#dbeafe' } }}>
                                <LinkOutlined sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => setEditReq(req)}
                                sx={{ color: '#225038', '&:hover': { bgcolor: '#f0fdf4' } }}>
                                <EditOutlinedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => handleDelete(req.id)}
                                sx={{ color: '#dc2626', '&:hover': { bgcolor: '#fee2e2' } }}>
                                <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {tab === 1 && (
          <CoverageMatrix requirements={requirements} testCases={testCases} />
        )}
      </Container>

      <ReqFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} initial={EMPTY_REQ} title="New Requirement" />
      <ReqFormDialog open={Boolean(editReq)} onClose={() => setEditReq(null)} onSave={handleEdit} initial={editReq} title="Edit Requirement" />
      <LinkTCDialog open={Boolean(linkReq)} onClose={() => setLinkReq(null)} requirement={linkReq} testCases={testCases} onLinked={loadAll} />

      <Snackbar open={snackbar.open} autoHideDuration={3500} onClose={() => setSnackbar(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: '12px', fontWeight: 600 }}
          onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
