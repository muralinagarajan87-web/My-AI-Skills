import { useState, useEffect } from 'react';
import {
  Container, Paper, Typography, Box, TextField, Button, Alert, Divider,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, FormControl,
  InputLabel, Select, MenuItem, Switch, FormControlLabel, Chip, Card, CardContent,
  Grid, Tooltip, Snackbar, InputAdornment, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import GitHub from '@mui/icons-material/GitHub';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { userAPI, environmentAPI, integrationAPI } from '../services/api';

const ENV_TYPE_STYLES = {
  dev:        { bg: '#dbeafe', color: '#2563eb', label: 'Dev' },
  staging:    { bg: '#fef9c3', color: '#ca8a04', label: 'Staging' },
  production: { bg: '#dcfce7', color: '#15803d', label: 'Production' },
  custom:     { bg: '#f1f5f9', color: '#64748b', label: 'Custom' },
};

function EnvTypeChip({ type }) {
  const s = ENV_TYPE_STYLES[type] || { bg: '#f1f5f9', color: '#64748b', label: type || '—' };
  return <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, height: 22, borderRadius: '6px' }} />;
}

/* ─── ENVIRONMENTS TAB ─────────────────────────────────────────────── */
function EnvironmentsTab() {
  const [envs, setEnvs] = useState([]);
  const [_loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editEnv, setEditEnv] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'dev', url: '', description: '', is_active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const r = await environmentAPI.getAll(); setEnvs(r.data || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditEnv(null);
    setForm({ name: '', type: 'dev', url: '', description: '', is_active: true });
    setOpen(true);
  };

  const openEdit = (env) => {
    setEditEnv(env);
    setForm({ name: env.name, type: env.type || 'dev', url: env.url || '', description: env.description || '', is_active: Boolean(env.is_active) });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editEnv) await environmentAPI.update(editEnv.id, form);
      else await environmentAPI.create(form);
      setOpen(false); load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this environment?')) return;
    try { await environmentAPI.delete(id); load(); } catch (e) { console.error(e); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Environments</Typography>
          <Typography variant="body2" color="text.secondary">Manage test environments (dev, staging, production)</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
          sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#1a3d2b' } }}>
          Add Environment
        </Button>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {['Name', 'Type', 'URL', 'Status', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #e2e8f0' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {_loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={24} sx={{ color: '#225038' }} /></TableCell></TableRow>
              ) : envs.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>No environments yet. Add one to get started.</Typography>
                </TableCell></TableRow>
              ) : envs.map(env => (
                <TableRow key={env.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{env.name}</Typography>
                    {env.description && <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{env.description}</Typography>}
                  </TableCell>
                  <TableCell><EnvTypeChip type={env.type} /></TableCell>
                  <TableCell>
                    {env.url ? (
                      <Box component="a" href={env.url} target="_blank" rel="noopener"
                        sx={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                        {env.url}
                      </Box>
                    ) : <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>—</Typography>}
                  </TableCell>
                  <TableCell>
                    <Chip label={env.is_active ? 'Active' : 'Inactive'} size="small"
                      sx={{ bgcolor: env.is_active ? '#dcfce7' : '#f1f5f9', color: env.is_active ? '#15803d' : '#64748b', fontWeight: 700, fontSize: 11, height: 22, borderRadius: '6px' }} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(env)} sx={{ color: '#225038', '&:hover': { bgcolor: '#f0fdf4' } }}>
                          <EditOutlinedIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(env.id)} sx={{ color: '#dc2626', '&:hover': { bgcolor: '#fee2e2' } }}>
                          <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', pb: 2 }}>
          <Typography variant="h6" fontWeight={700}>{editEnv ? 'Edit Environment' : 'Add Environment'}</Typography>
          <IconButton size="small" onClick={() => setOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField fullWidth required label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Production, Staging US" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={form.type} label="Type" onChange={e => setForm(p => ({ ...p, type: e.target.value }))} sx={{ borderRadius: '10px' }}>
                  <MenuItem value="dev">Dev</MenuItem>
                  <MenuItem value="staging">Staging</MenuItem>
                  <MenuItem value="production">Production</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="URL" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                placeholder="https://staging.example.com" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#225038' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#4ade80' } }} />}
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)} variant="outlined" sx={{ borderRadius: '10px' }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving || !form.name.trim()}
            sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#1a3d2b' } }}>
            {saving ? 'Saving...' : editEnv ? 'Save Changes' : 'Add Environment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ─── INTEGRATIONS TAB ─────────────────────────────────────────────── */
function IntegrationsTab() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [configOpen, setConfigOpen] = useState(null); // 'github' | 'slack' | 'github_actions'
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const webhookUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/webhooks/github-actions`;

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const r = await integrationAPI.getAll(); setIntegrations(r.data || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getIntegration = (type) => integrations.find(i => i.type === type);

  const openConfig = (type) => {
    const existing = getIntegration(type);
    if (type === 'github') {
      setForm({ token: existing?.config?.token || '', owner: existing?.config?.owner || '', repo: existing?.config?.repo || '' });
    } else if (type === 'slack') {
      setForm({ webhook_url: existing?.config?.webhook_url || '' });
    } else {
      setForm({});
    }
    setTestResult(null);
    setConfigOpen(type);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = getIntegration(configOpen);
      const payload = { type: configOpen, config: form };
      if (existing) await integrationAPI.update(existing.id, payload);
      else await integrationAPI.create(payload);
      setConfigOpen(null);
      load();
      setSnackbar({ open: true, message: 'Integration saved', severity: 'success' });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    const existing = getIntegration(configOpen);
    if (!existing) { setTestResult({ success: false, message: 'Save integration first before testing.' }); return; }
    setTesting(true);
    setTestResult(null);
    try {
      await integrationAPI.test(existing.id);
      setTestResult({ success: true, message: 'Connection successful!' });
    } catch (e) {
      setTestResult({ success: false, message: e.response?.data?.error || 'Connection failed. Check your credentials.' });
    } finally { setTesting(false); }
  };

  const handleDelete = async (type) => {
    const existing = getIntegration(type);
    if (!existing) return;
    if (!window.confirm(`Remove ${type} integration?`)) return;
    try { await integrationAPI.delete(existing.id); load(); setSnackbar({ open: true, message: 'Integration removed', severity: 'info' }); }
    catch (e) { console.error(e); }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setSnackbar({ open: true, message: 'Webhook URL copied!', severity: 'success' });
    });
  };

  const INTEGRATION_CARDS = [
    {
      key: 'github',
      icon: <GitHub sx={{ fontSize: 32, color: '#24292f' }} />,
      name: 'GitHub',
      desc: 'Link defects to GitHub Issues. Auto-create issues from defect reports.',
      fields: ['token', 'owner', 'repo'],
    },
    {
      key: 'slack',
      icon: <NotificationsOutlinedIcon sx={{ fontSize: 32, color: '#4a154b' }} />,
      name: 'Slack',
      desc: 'Get notified on test failures, new defects, and milestone updates.',
      fields: ['webhook_url'],
    },
    {
      key: 'github_actions',
      icon: <BuildOutlinedIcon sx={{ fontSize: 32, color: '#0ea5e9' }} />,
      name: 'GitHub Actions',
      desc: 'Trigger test result imports from your CI/CD pipeline automatically.',
      fields: [],
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>Integrations</Typography>
        <Typography variant="body2" color="text.secondary">Connect Flywl with external tools and services</Typography>
      </Box>

      <Grid container spacing={2.5}>
        {INTEGRATION_CARDS.map(card => {
          const existing = getIntegration(card.key);
          const isConnected = Boolean(existing);
          return (
            <Grid item xs={12} md={4} key={card.key}>
              <Card elevation={0} sx={{ border: `1.5px solid ${isConnected ? '#86efac' : '#e2e8f0'}`, borderRadius: '16px', height: '100%', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {card.icon}
                    </Box>
                    <Chip
                      label={isConnected ? 'Connected' : 'Not configured'}
                      size="small"
                      icon={isConnected ? <CheckCircleOutlinedIcon sx={{ fontSize: '14px !important', color: '#16a34a !important' }} /> : <ErrorOutlineIcon sx={{ fontSize: '14px !important', color: '#94a3b8 !important' }} />}
                      sx={{ bgcolor: isConnected ? '#dcfce7' : '#f1f5f9', color: isConnected ? '#15803d' : '#64748b', fontWeight: 700, fontSize: 11, height: 22, borderRadius: '20px' }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.75 }}>{card.name}</Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6, mb: 2.5 }}>{card.desc}</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" size="small" onClick={() => openConfig(card.key)}
                      sx={{ flex: 1, bgcolor: '#225038', borderRadius: '8px', fontSize: 12, fontWeight: 700, '&:hover': { bgcolor: '#1a3d2b' } }}>
                      {isConnected ? 'Configure' : 'Set up'}
                    </Button>
                    {isConnected && (
                      <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(card.key)}
                        sx={{ borderRadius: '8px', fontSize: 12 }}>
                        Remove
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Config dialogs */}
      {/* GitHub */}
      <Dialog open={configOpen === 'github'} onClose={() => setConfigOpen(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GitHub sx={{ fontSize: 22 }} />
            <Typography variant="h6" fontWeight={700}>GitHub Configuration</Typography>
          </Box>
          <IconButton size="small" onClick={() => setConfigOpen(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth label="Personal Access Token" type={showToken ? 'text' : 'password'} value={form.token || ''}
            onChange={e => setForm(p => ({ ...p, token: e.target.value }))}
            placeholder="ghp_xxxxxxxxxx"
            helperText="Needs 'repo' scope. Generate at github.com/settings/tokens"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowToken(!showToken)}>
                    {showToken ? <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="GitHub Owner" value={form.owner || ''} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
                placeholder="your-username or org-name" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Repository Name" value={form.repo || ''} onChange={e => setForm(p => ({ ...p, repo: e.target.value }))}
                placeholder="my-repo" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            </Grid>
          </Grid>
          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2.5, borderRadius: '10px' }}>
              {testResult.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2, gap: 1 }}>
          <Button onClick={handleTest} disabled={testing} variant="outlined"
            sx={{ borderRadius: '10px', borderColor: '#225038', color: '#225038' }}>
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}
            sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#1a3d2b' } }}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Slack */}
      <Dialog open={configOpen === 'slack'} onClose={() => setConfigOpen(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <NotificationsOutlinedIcon sx={{ fontSize: 22, color: '#4a154b' }} />
            <Typography variant="h6" fontWeight={700}>Slack Configuration</Typography>
          </Box>
          <IconButton size="small" onClick={() => setConfigOpen(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth label="Incoming Webhook URL" value={form.webhook_url || ''}
            onChange={e => setForm(p => ({ ...p, webhook_url: e.target.value }))}
            placeholder="https://hooks.slack.com/services/..."
            helperText="Create at api.slack.com/apps → Incoming Webhooks"
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 1, borderRadius: '10px' }}>
              {testResult.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2, gap: 1 }}>
          <Button onClick={handleTest} disabled={testing} variant="outlined" sx={{ borderRadius: '10px', borderColor: '#4a154b', color: '#4a154b' }}>
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}
            sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#1a3d2b' } }}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* GitHub Actions */}
      <Dialog open={configOpen === 'github_actions'} onClose={() => setConfigOpen(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <BuildOutlinedIcon sx={{ fontSize: 22, color: '#0ea5e9' }} />
            <Typography variant="h6" fontWeight={700}>GitHub Actions Webhook</Typography>
          </Box>
          <IconButton size="small" onClick={() => setConfigOpen(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ fontSize: 14, color: '#374151', mb: 2, lineHeight: 1.7 }}>
            Use this webhook URL in your GitHub Actions workflow to automatically import test results into Flywl after your test suite runs.
          </Typography>
          <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', p: 2, mb: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>Webhook URL</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 13, color: '#1e293b', fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                {webhookUrl}
              </Typography>
              <Tooltip title="Copy to clipboard">
                <IconButton size="small" onClick={copyWebhook} sx={{ color: '#225038', '&:hover': { bgcolor: '#f0fdf4' } }}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', p: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#374151', mb: 1 }}>Example workflow step:</Typography>
            <Box component="pre" sx={{ fontSize: 12, color: '#225038', fontFamily: 'monospace', m: 0, overflow: 'auto', lineHeight: 1.6 }}>
              {'- name: Report to Flywl\n  if: always()\n  run: |\n    curl -X POST "' + webhookUrl + '" \\\n      -H "Content-Type: application/json" \\\n      -d \'{"run_id": "RUN_ID", "results": []}\''}

            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2 }}>
          <Button onClick={() => setConfigOpen(null)} variant="outlined" sx={{ borderRadius: '10px' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: '12px', fontWeight: 600 }} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* ─── ACCOUNT TAB ──────────────────────────────────────────────────── */
function AccountTab({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('tester');
  const [inviteMessage, setInviteMessage] = useState(null);

  const handleChangePassword = async () => {
    setPasswordMessage(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Please fill all password fields.' }); return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' }); return;
    }
    try {
      await userAPI.changePassword(currentPassword, newPassword);
      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.response?.data?.error || 'Error updating password' });
    }
  };

  const handleInvite = async () => {
    setInviteMessage(null);
    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteMessage({ type: 'error', text: 'Name and email are required.' }); return;
    }
    try {
      const response = await userAPI.inviteUser(inviteEmail.trim(), inviteName.trim(), inviteRole);
      setInviteMessage({ type: 'success', text: `Invited ${response.data.user.email}. Temporary password: ${response.data.temporaryPassword}` });
      setInviteEmail(''); setInviteName('');
    } catch (err) {
      setInviteMessage({ type: 'error', text: err.response?.data?.error || 'Error inviting user' });
    }
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Account</Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Name: <strong>{user.name}</strong> · Email: <strong>{user.email}</strong> · Role: <strong>{user.role}</strong>
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Change Password</Typography>
        {passwordMessage && <Alert severity={passwordMessage.type} sx={{ mb: 2, borderRadius: '10px' }}>{passwordMessage.text}</Alert>}
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField type="password" label="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
          <TextField type="password" label="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
          <TextField type="password" label="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
          <Button variant="contained" onClick={handleChangePassword}
            sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 700, width: 'fit-content', '&:hover': { bgcolor: '#1a3d2b' } }}>
            Update password
          </Button>
        </Box>
      </Paper>

      {user.role === 'admin' && (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Invite User</Typography>
          {inviteMessage && <Alert severity={inviteMessage.type} sx={{ mb: 2, borderRadius: '10px' }}>{inviteMessage.text}</Alert>}
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField label="Name" value={inviteName} onChange={e => setInviteName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            <TextField label="Email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            <TextField select label="Role" value={inviteRole} onChange={e => setInviteRole(e.target.value)} SelectProps={{ native: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <option value="tester">Tester</option>
              <option value="admin">Admin</option>
            </TextField>
            <Button variant="contained" onClick={handleInvite}
              sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 700, width: 'fit-content', '&:hover': { bgcolor: '#1a3d2b' } }}>
              Send invite
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

/* ─── MAIN ──────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [tab, setTab] = useState(0);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 800 }}>Settings</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid #e2e8f0',
        '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13, color: '#64748b' },
        '& .Mui-selected': { color: '#225038' },
        '& .MuiTabs-indicator': { bgcolor: '#225038' } }}>
        <Tab label="Account" />
        <Tab label="Environments" />
        <Tab label="Integrations" />
      </Tabs>

      {tab === 0 && <AccountTab user={user} />}
      {tab === 1 && <EnvironmentsTab />}
      {tab === 2 && <IntegrationsTab />}
    </Container>
  );
}
