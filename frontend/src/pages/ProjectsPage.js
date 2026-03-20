import React, { useState, useEffect } from 'react';
import {
  Container, Paper, TextField, Button, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, RadioGroup, FormControlLabel, Radio, Switch, FormGroup
} from '@mui/material';
import { workspaceAPI, userAPI } from '../services/api';

export default function ProjectsPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [users, setUsers] = useState([]);

  useEffect(() => { loadWorkspaces(); loadUsers(); }, []);

  const loadUsers = async () => {
    try { const r = await userAPI.getAll(); setUsers(r.data); } catch(e) { /* ignore */ }
  };

  const loadWorkspaces = async () => {
    try {
      const response = await workspaceAPI.getAll();
      setWorkspaces(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenNew = () => {
    setEditing({ name: '', announcement: '', repoMode: 'single', enableAI: false, access: [] });
    setTabIndex(0);
    setOpenDialog(true);
  };

  const handleOpenEdit = (ws) => {
    setEditing({ ...ws, repoMode: ws.repoMode || 'single', enableAI: !!ws.enableAI, access: ws.access || [] });
    setTabIndex(0);
    setOpenDialog(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editing.id) {
        await workspaceAPI.update(editing.id, editing);
      } else {
        await workspaceAPI.create(editing);
      }
      setOpenDialog(false);
      loadWorkspaces();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Unable to save project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ws) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await workspaceAPI.delete(ws.id);
      loadWorkspaces();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Projects</Typography>
        <Button variant="contained" onClick={handleOpenNew}>+ Add Project</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell><strong>Project Name</strong></TableCell>
              <TableCell><strong>Announcement</strong></TableCell>
              <TableCell align="center"><strong>Action</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workspaces.map(ws => (
              <TableRow key={ws.id}>
                <TableCell>{ws.name}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{ws.announcement || '-'}</TableCell>
                <TableCell align="center">
                  <Button size="small" onClick={() => handleOpenEdit(ws)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => handleDelete(ws)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing?.id ? 'Edit Project' : 'Add Project'}</DialogTitle>
        <DialogContent>
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
            <Tab label="Project" />
            <Tab label="Access" />
            <Tab label="Defects" />
            <Tab label="References" />
            <Tab label="User Variables" />
          </Tabs>

          {tabIndex === 0 && (
            <Box>
              <TextField fullWidth label="Name" value={editing?.name || ''} onChange={(e) => setEditing(prev => ({ ...prev, name: e.target.value }))} sx={{ mb: 2 }} />
              <TextField fullWidth label="Announcement" multiline rows={4} value={editing?.announcement || ''} onChange={(e) => setEditing(prev => ({ ...prev, announcement: e.target.value }))} sx={{ mb: 2 }} />

              <Typography variant="subtitle1" sx={{ mb: 1 }}>Repository Options</Typography>
              <RadioGroup value={editing?.repoMode || 'single'} onChange={(e) => setEditing(prev => ({ ...prev, repoMode: e.target.value }))}>
                <FormControlLabel value="single" control={<Radio />} label="Use a single repository for all cases (recommended)" />
                <FormControlLabel value="baseline" control={<Radio />} label="Use a single repository with baseline support" />
                <FormControlLabel value="multiple" control={<Radio />} label="Use multiple test suites to manage cases" />
              </RadioGroup>

              <FormGroup sx={{ mt: 2 }}>
                <FormControlLabel control={<Switch checked={!!editing?.enableAI} onChange={(e) => setEditing(prev => ({ ...prev, enableAI: e.target.checked }))} />} label="Enable AI Test Case Generation" />
              </FormGroup>
            </Box>
          )}

          {tabIndex === 1 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Who can access the project</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>Add users by email or select roles/groups that should have access.</Typography>
              <TextField fullWidth label="Add user email" placeholder="user@example.com" onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const email = e.target.value.trim();
                  if (!email) return;
                  const next = [...(editing.access || []), { type: 'user', value: email }];
                  setEditing(prev => ({ ...prev, access: next }));
                  e.target.value = '';
                }
              }} sx={{ mb: 2 }} />

              <Box sx={{ mb: 2 }}>
                {(editing?.access || []).map((a, i) => (
                  <Paper key={i} sx={{ display: 'inline-block', p: 1, mr: 1, mb: 1 }}>
                    <Typography variant="body2">{a.type}: {a.value}</Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}

          {tabIndex === 2 && (
            <Box>
              <Typography variant="subtitle1">Defects</Typography>
              <TextField fullWidth label="Defect tracker URL" placeholder="https://sentry.example.com/project" value={editing?.defectsUrl || ''} onChange={(e) => setEditing(prev => ({ ...prev, defectsUrl: e.target.value }))} sx={{ mt: 1 }} />
            </Box>
          )}

          {tabIndex === 3 && (
            <Box>
              <Typography variant="subtitle1">References</Typography>
              <TextField fullWidth label="Reference links (comma separated)" value={(editing?.references || []).join(', ')} onChange={(e) => setEditing(prev => ({ ...prev, references: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} sx={{ mt: 1 }} />
            </Box>
          )}

          {tabIndex === 4 && (
            <Box>
              <Typography variant="subtitle1">User Variables</Typography>
              <TextField fullWidth label="Variables (JSON)" multiline rows={4} value={editing?.userVariables ? JSON.stringify(editing.userVariables, null, 2) : ''} onChange={(e) => {
                try { const parsed = JSON.parse(e.target.value); setEditing(prev => ({ ...prev, userVariables: parsed })); } catch { /* ignore invalid json while typing */ }
              }} sx={{ mt: 1 }} />
            </Box>
          )}

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
