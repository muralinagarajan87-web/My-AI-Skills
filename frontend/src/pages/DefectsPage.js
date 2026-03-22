import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Container, Typography, Button, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel, Select,
  MenuItem, IconButton, Tooltip, Drawer, Tabs, Tab, Grid, Card, CardContent,
  InputAdornment, Snackbar, Alert, CircularProgress, Divider, FormControlLabel,
  Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BugReportOutlined from '@mui/icons-material/BugReportOutlined';
import GitHub from '@mui/icons-material/GitHub';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { defectAPI, testCaseAPI, userAPI } from '../services/api';
import CommentThread from '../components/CommentThread';
import AttachmentPanel from '../components/AttachmentPanel';

const SEVERITY_STYLES = {
  critical: { bg: '#fee2e2', color: '#ef4444', label: 'Critical' },
  high:     { bg: '#ffedd5', color: '#f97316', label: 'High' },
  medium:   { bg: '#fef9c3', color: '#f59e0b', label: 'Medium' },
  low:      { bg: '#dbeafe', color: '#3b82f6', label: 'Low' },
};

const STATUS_STYLES = {
  open:        { bg: '#fee2e2', color: '#dc2626', label: 'Open' },
  in_progress: { bg: '#dbeafe', color: '#2563eb', label: 'In Progress' },
  resolved:    { bg: '#dcfce7', color: '#16a34a', label: 'Resolved' },
  closed:      { bg: '#f1f5f9', color: '#64748b', label: 'Closed' },
};

function SeverityChip({ severity }) {
  const s = SEVERITY_STYLES[severity] || { bg: '#f1f5f9', color: '#64748b', label: severity || '—' };
  return <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, height: 22, borderRadius: '6px' }} />;
}

function StatusChip({ status }) {
  const s = STATUS_STYLES[status] || { bg: '#f1f5f9', color: '#64748b', label: status || '—' };
  return <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, height: 22, borderRadius: '6px' }} />;
}

const EMPTY_FORM = { title: '', description: '', severity: 'medium', status: 'open', test_case_id: '', assignee_id: '', create_github_issue: false };

function DefectFormDialog({ open, onClose, onSave, initial, testCases, users, title }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial || EMPTY_FORM); }, [initial, open]);

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
        <TextField
          fullWidth required label="Title" value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          placeholder="Brief description of the defect"
          sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        />
        <TextField
          fullWidth multiline rows={3} label="Description" value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Steps to reproduce, expected vs actual behavior..."
          sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        />
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select value={form.severity} label="Severity" onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}
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
              <Select value={form.status} label="Status" onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                sx={{ borderRadius: '10px' }}>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Related Test Case</InputLabel>
              <Select value={form.test_case_id || ''} label="Related Test Case"
                onChange={e => setForm(p => ({ ...p, test_case_id: e.target.value }))}
                sx={{ borderRadius: '10px' }}>
                <MenuItem value="">None</MenuItem>
                {testCases.map(tc => <MenuItem key={tc.id} value={tc.id}>TC-{tc.id}: {tc.title}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Assignee</InputLabel>
              <Select value={form.assignee_id || ''} label="Assignee"
                onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value }))}
                sx={{ borderRadius: '10px' }}>
                <MenuItem value="">Unassigned</MenuItem>
                {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <FormControlLabel
          control={<Checkbox checked={Boolean(form.create_github_issue)} onChange={e => setForm(p => ({ ...p, create_github_issue: e.target.checked }))} sx={{ '&.Mui-checked': { color: '#225038' } }} />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GitHub sx={{ fontSize: 16, color: '#24292f' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Also create GitHub Issue</Typography>
            </Box>
          }
        />
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '10px' }}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.title.trim()}
          sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#1a3d2b' } }}>
          {saving ? 'Saving...' : 'Save Defect'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DetailDrawer({ defect, open, onClose, testCases }) {
  const [activeTab, setActiveTab] = useState(0);
  if (!defect) return null;
  const tc = testCases.find(t => String(t.id) === String(defect.test_case_id));

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 600 }, p: 0 } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #1a3d2b 0%, #225038 100%)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, mr: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                  DEF-{defect.id}
                </Typography>
                <SeverityChip severity={defect.severity} />
                <StatusChip status={defect.status} />
              </Box>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{defect.title}</Typography>
            </Box>
            <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ px: 3, borderBottom: '1px solid #e2e8f0', minHeight: 44,
          '& .MuiTab-root': { minHeight: 44, fontSize: 13, fontWeight: 600, textTransform: 'none', color: '#64748b' },
          '& .Mui-selected': { color: '#225038' },
          '& .MuiTabs-indicator': { bgcolor: '#225038' } }}>
          <Tab label="Details" />
          <Tab label="Comments" />
          <Tab label="Attachments" />
        </Tabs>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {activeTab === 0 && (
            <Box>
              {defect.description && (
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, mb: 1 }}>Description</Typography>
                  <Typography sx={{ fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{defect.description}</Typography>
                </Box>
              )}
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={2}>
                {[
                  { label: 'Severity', value: <SeverityChip severity={defect.severity} /> },
                  { label: 'Status', value: <StatusChip status={defect.status} /> },
                  { label: 'Assignee', value: defect.assignee_name || 'Unassigned' },
                  { label: 'Related Test Case', value: tc ? `TC-${tc.id}: ${tc.title}` : '—' },
                  { label: 'Created', value: defect.created_at ? new Date(defect.created_at).toLocaleString() : '—' },
                  { label: 'GitHub Issue', value: defect.github_issue_url ? (
                    <Box component="a" href={defect.github_issue_url} target="_blank" rel="noopener"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#2563eb', textDecoration: 'none', fontSize: 13,
                        '&:hover': { textDecoration: 'underline' } }}>
                      <GitHub sx={{ fontSize: 14 }} />
                      #{defect.github_issue_number}
                      <OpenInNewIcon sx={{ fontSize: 12 }} />
                    </Box>
                  ) : '—' },
                ].map(item => (
                  <Grid item xs={6} key={item.label}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>{item.label}</Typography>
                    {typeof item.value === 'string'
                      ? <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{item.value}</Typography>
                      : item.value}
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          {activeTab === 1 && (
            <CommentThread entityType="defect" entityId={defect.id} />
          )}
          {activeTab === 2 && (
            <AttachmentPanel entityType="defect" entityId={defect.id} />
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

export default function DefectsPage() {
  const [defects, setDefects] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, critical: 0 });
  const [testCases, setTestCases] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editDefect, setEditDefect] = useState(null);
  const [detailDefect, setDetailDefect] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dRes, tcRes, uRes] = await Promise.allSettled([
        defectAPI.getAll(),
        testCaseAPI.getAll(),
        userAPI.getAll(),
      ]);
      if (dRes.status === 'fulfilled') setDefects(dRes.value.data || []);
      if (tcRes.status === 'fulfilled') setTestCases(tcRes.value.data || []);
      if (uRes.status === 'fulfilled') setUsers(uRes.value.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
    try {
      const sRes = await defectAPI.getStats();
      setStats(sRes.data || {});
    } catch (e) { /* stats endpoint may not exist yet */ }
  };

  const computedStats = useMemo(() => ({
    total: defects.length,
    open: defects.filter(d => d.status === 'open').length,
    critical: defects.filter(d => d.severity === 'critical').length,
  }), [defects]);

  const filtered = useMemo(() => defects.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.title?.toLowerCase().includes(q) || String(d.id).includes(q);
    const matchStatus = !filterStatus || d.status === filterStatus;
    const matchSeverity = !filterSeverity || d.severity === filterSeverity;
    return matchSearch && matchStatus && matchSeverity;
  }), [defects, search, filterStatus, filterSeverity]);

  const handleCreate = async (form) => {
    await defectAPI.create(form);
    loadAll();
    showSnack('Defect created');
  };

  const handleEdit = async (form) => {
    await defectAPI.update(editDefect.id, form);
    loadAll();
    showSnack('Defect updated');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this defect?')) return;
    await defectAPI.delete(id);
    loadAll();
    showSnack('Defect deleted');
  };

  const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const tcMap = useMemo(() => Object.fromEntries(testCases.map(tc => [tc.id, tc])), [testCases]);

  return (
    <Box sx={{ bgcolor: '#f4f6f9', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a3d2b 0%, #225038 60%, #2d6a4f 100%)', px: { xs: 3, md: 5 }, pt: 3.5, pb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <BugReportOutlined sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Bug Tracker
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1.2, mb: 0.5 }}>Defects</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {[
                { label: 'Total', value: computedStats.total, color: '#4ade80' },
                { label: 'Open', value: computedStats.open, color: '#f87171' },
                { label: 'Critical', value: computedStats.critical, color: '#ef4444' },
              ].map(s => (
                <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.6, borderRadius: '20px',
                  bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.color }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{s.value} {s.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
            sx={{ bgcolor: 'white', color: '#225038', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: '#f0fdf4' } }}>
            New Defect
          </Button>
        </Box>
      </Box>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Filter bar */}
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', mb: 2.5, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.4, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search defects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              size="small"
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment> }}
              sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: '9px', fontSize: 13, bgcolor: '#f8fafc' } }}
            />

            {/* Status filter */}
            {['', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
              <Chip key={s}
                label={s === '' ? 'All Status' : STATUS_STYLES[s]?.label || s}
                onClick={() => setFilterStatus(s)}
                sx={{
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  bgcolor: filterStatus === s ? '#225038' : '#f1f5f9',
                  color: filterStatus === s ? 'white' : '#475569',
                  border: filterStatus === s ? '1px solid #225038' : '1px solid #e2e8f0',
                  '&:hover': { bgcolor: filterStatus === s ? '#1a3d2b' : '#e2e8f0' },
                }}
              />
            ))}

            <Divider orientation="vertical" flexItem />

            {/* Severity filter */}
            {['', 'critical', 'high', 'medium', 'low'].map(s => {
              const style = SEVERITY_STYLES[s];
              return (
                <Chip key={s}
                  label={s === '' ? 'All Severity' : style?.label || s}
                  onClick={() => setFilterSeverity(s)}
                  sx={{
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    bgcolor: filterSeverity === s ? (style?.color || '#225038') : '#f1f5f9',
                    color: filterSeverity === s ? 'white' : '#475569',
                    border: filterSeverity === s ? `1px solid ${style?.color || '#225038'}` : '1px solid #e2e8f0',
                    '&:hover': { opacity: 0.9 },
                  }}
                />
              );
            })}
          </Box>
        </Paper>

        {/* Table */}
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
          <TableContainer>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {['ID', 'Title', 'Severity', 'Status', 'Test Case', 'Assignee', 'GitHub', 'Created', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#64748b', borderBottom: '2px solid #e2e8f0', py: 1.5, whiteSpace: 'nowrap' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={28} sx={{ color: '#225038' }} />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                      <BugReportOutlined sx={{ fontSize: 40, color: '#e2e8f0', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary' }}>
                        {search || filterStatus || filterSeverity ? 'No defects match filters' : 'No defects yet'}
                      </Typography>
                      {!search && !filterStatus && !filterSeverity && (
                        <Button startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ mt: 1, color: '#225038', fontSize: 12 }}>
                          Create first defect
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : filtered.map(defect => {
                  const tc = tcMap[defect.test_case_id];
                  return (
                    <TableRow key={defect.id}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f8fffe' }, transition: 'background 0.12s' }}
                      onClick={() => setDetailDefect(defect)}>
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'inline-flex', px: 1, py: 0.3, borderRadius: '6px', bgcolor: '#f1f5f9' }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', fontFamily: 'monospace' }}>
                            DEF-{defect.id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, maxWidth: 280 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {defect.title}
                        </Typography>
                        {defect.description && (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {defect.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}><SeverityChip severity={defect.severity} /></TableCell>
                      <TableCell sx={{ py: 1.5 }}><StatusChip status={defect.status} /></TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {tc ? (
                          <Typography sx={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>TC-{tc.id}</Typography>
                        ) : <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>—</Typography>}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography sx={{ fontSize: 12, color: '#374151' }}>{defect.assignee_name || '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }} onClick={e => e.stopPropagation()}>
                        {defect.github_issue_url ? (
                          <Tooltip title={`GitHub Issue #${defect.github_issue_number}`}>
                            <IconButton size="small" component="a" href={defect.github_issue_url} target="_blank" rel="noopener"
                              sx={{ color: '#24292f', '&:hover': { bgcolor: '#f1f5f9' } }}>
                              <GitHub sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {defect.created_at ? new Date(defect.created_at).toLocaleDateString() : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }} onClick={e => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => { setEditDefect(defect); }}
                              sx={{ color: '#225038', '&:hover': { bgcolor: '#f0fdf4' } }}>
                              <EditOutlinedIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDelete(defect.id)}
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
      </Container>

      {/* Create dialog */}
      <DefectFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
        initial={EMPTY_FORM}
        testCases={testCases}
        users={users}
        title="New Defect"
      />

      {/* Edit dialog */}
      <DefectFormDialog
        open={Boolean(editDefect)}
        onClose={() => setEditDefect(null)}
        onSave={handleEdit}
        initial={editDefect}
        testCases={testCases}
        users={users}
        title="Edit Defect"
      />

      {/* Detail drawer */}
      <DetailDrawer
        defect={detailDefect}
        open={Boolean(detailDefect)}
        onClose={() => setDetailDefect(null)}
        testCases={testCases}
      />

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
