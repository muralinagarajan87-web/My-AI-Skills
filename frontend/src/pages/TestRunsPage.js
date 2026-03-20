import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, Box, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Checkbox,
  FormControlLabel, Chip, InputAdornment, Divider,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { testRunAPI, testCaseAPI, workspaceAPI } from '../services/api';

export default function TestRunsPage() {
  const [testRuns, setTestRuns] = useState([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [allTestCases, setAllTestCases] = useState([]);
  const [filteredTestCases, setFilteredTestCases] = useState([]);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [runForm, setRunForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadWorkspace();
    loadTestRuns();
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (createOpen) {
      loadAllTestCases();
      setSelectedWorkspaceId(currentUser.workspace_id ? String(currentUser.workspace_id) : '');
    }
  }, [createOpen]);

  useEffect(() => {
    let filtered = allTestCases;
    if (selectedWorkspaceId) {
      filtered = filtered.filter(tc => String(tc.workspace_id) === String(selectedWorkspaceId));
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter(tc =>
        tc.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredTestCases(filtered);
  }, [allTestCases, selectedWorkspaceId, searchQuery]);

  const loadWorkspace = async () => {
    try {
      if (currentUser.workspace_id) {
        const res = await workspaceAPI.get(currentUser.workspace_id);
        setWorkspaceName(res.data.name);
      }
    } catch (e) { console.error(e); }
  };

  const loadWorkspaces = async () => {
    try {
      const res = await workspaceAPI.getAll();
      setWorkspaces(res.data);
    } catch (e) { console.error(e); }
  };

  const loadTestRuns = async () => {
    try {
      const res = await testRunAPI.getAll();
      setTestRuns(res.data);
    } catch (e) { console.error(e); }
  };

  const loadAllTestCases = async () => {
    try {
      const res = await testCaseAPI.getAll();
      setAllTestCases(res.data);
      setFilteredTestCases(res.data);
    } catch (e) { console.error(e); }
  };

  const handleToggleTestCase = (id) => {
    setSelectedTestCaseIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTestCaseIds.length === filteredTestCases.length) {
      setSelectedTestCaseIds([]);
    } else {
      setSelectedTestCaseIds(filteredTestCases.map(tc => tc.id));
    }
  };

  const handleOpenCreate = () => {
    setRunForm({ name: '', description: '' });
    setSelectedTestCaseIds([]);
    setSearchQuery('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!runForm.name.trim()) return;
    try {
      setCreating(true);
      await testRunAPI.create({
        name: runForm.name,
        description: runForm.description,
        test_case_ids: selectedTestCaseIds
      });
      setCreateOpen(false);
      loadTestRuns();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  // Compute stats from run data (if backend includes counts)
  const getRunStats = (run) => {
    const passed = run.pass_count ?? run.passed ?? 0;
    const failed = run.fail_count ?? run.failed ?? 0;
    const skipped = run.skip_count ?? run.skipped ?? 0;
    const total = run.total_count ?? run.total ?? (passed + failed + skipped);
    const notStarted = total - passed - failed - skipped;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { passed, failed, skipped, total, notStarted, passRate };
  };

  const getStatus = (run) => run.computed_status || run.status || 'In Progress';

  const statusColor = (status) => {
    if (!status) return 'default';
    const s = status.toLowerCase();
    if (s === 'completed') return 'success';
    if (s === 'failed') return 'error';
    if (s === 'in progress' || s === 'active') return 'warning';
    return 'default';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">Test Runs</Typography>
          {workspaceName && (
            <Typography variant="subtitle2" color="textSecondary">
              Project: {workspaceName}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={handleOpenCreate}>
            + Create Test Run
          </Button>
          <Button component={RouterLink} to="/dashboard" variant="outlined">
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      {/* Test Runs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Progress</strong></TableCell>
              <TableCell><strong>Results</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Created</strong></TableCell>
              <TableCell align="center"><strong>Action</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {testRuns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No test runs yet. Click "+ Create Test Run" to get started.
                </TableCell>
              </TableRow>
            ) : (
              testRuns.map(run => {
                const stats = getRunStats(run);
                return (
                  <TableRow key={run.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{run.name}</Typography>
                      {run.description && (
                        <Typography variant="caption" color="text.secondary">{run.description}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      {stats.total > 0 ? (
                        <Box>
                          <Box sx={{ display: 'flex', height: 10, borderRadius: 1, overflow: 'hidden', mb: 0.5 }}>
                            <Box sx={{ width: `${stats.passRate}%`, bgcolor: 'success.main' }} />
                            <Box sx={{ width: `${stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}%`, bgcolor: 'error.main' }} />
                            <Box sx={{ width: `${stats.total > 0 ? Math.round((stats.skipped / stats.total) * 100) : 0}%`, bgcolor: 'warning.main' }} />
                            <Box sx={{ flex: 1, bgcolor: 'grey.300' }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {stats.passRate}% passed
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">No results yet</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {stats.total > 0 ? (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip label={`✓ ${stats.passed}`} size="small" color="success" variant="outlined" />
                          <Chip label={`✗ ${stats.failed}`} size="small" color="error" variant="outlined" />
                          <Chip label={`⊘ ${stats.skipped}`} size="small" color="warning" variant="outlined" />
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatus(run)}
                        size="small"
                        color={statusColor(getStatus(run))}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(run.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button component={RouterLink} to={`/test-run/${run.id}`} size="small" variant="outlined">
                        View & Run
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Test Run Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { minHeight: '70vh' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: 1, borderColor: 'divider', pb: 2 }}>
          <Typography variant="h6">Create Test Run</Typography>
          <IconButton size="small" onClick={() => setCreateOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {/* Run details */}
          <TextField
            fullWidth
            label="Run Name"
            required
            value={runForm.name}
            onChange={(e) => setRunForm(p => ({ ...p, name: e.target.value }))}
            size="small"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={runForm.description}
            onChange={(e) => setRunForm(p => ({ ...p, description: e.target.value }))}
            size="small"
            multiline
            rows={2}
            sx={{ mb: 3 }}
          />

          <Divider sx={{ mb: 2 }} />

          {/* Test Case Selector */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Select Test Cases
              {selectedTestCaseIds.length > 0 && (
                <Chip label={`${selectedTestCaseIds.length} selected`} size="small"
                  color="primary" sx={{ ml: 1 }} />
              )}
            </Typography>
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              select
              label="Filter by Project"
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All Projects</MenuItem>
              {workspaces.map(ws => (
                <MenuItem key={ws.id} value={String(ws.id)}>{ws.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                )
              }}
            />
          </Box>

          {/* Select All */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, px: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={filteredTestCases.length > 0 && selectedTestCaseIds.length === filteredTestCases.length}
                  indeterminate={selectedTestCaseIds.length > 0 && selectedTestCaseIds.length < filteredTestCases.length}
                  onChange={handleSelectAll}
                />
              }
              label={<Typography variant="body2" fontWeight={500}>Select All ({filteredTestCases.length})</Typography>}
              sx={{ m: 0 }}
            />
          </Box>

          {/* Test case list */}
          <Paper variant="outlined" sx={{ maxHeight: 280, overflowY: 'auto' }}>
            {filteredTestCases.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No test cases found. Create test cases first from the Test Cases page.
                </Typography>
              </Box>
            ) : (
              filteredTestCases.map((tc, idx) => (
                <Box key={tc.id} sx={{
                  display: 'flex', alignItems: 'center', px: 2, py: 1,
                  borderBottom: idx < filteredTestCases.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  bgcolor: selectedTestCaseIds.includes(tc.id) ? 'primary.50' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' }
                }}>
                  <Checkbox
                    size="small"
                    checked={selectedTestCaseIds.includes(tc.id)}
                    onChange={() => handleToggleTestCase(tc.id)}
                    sx={{ mr: 1 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2">{tc.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.25 }}>
                      {tc.priority && (
                        <Chip label={tc.priority} size="small" variant="outlined"
                          color={tc.priority === 'Critical' ? 'error' : tc.priority === 'High' ? 'warning' : 'default'}
                          sx={{ height: 18, fontSize: 10 }} />
                      )}
                      {workspaces.find(w => w.id === tc.workspace_id)?.name && (
                        <Typography variant="caption" color="text.secondary">
                          {workspaces.find(w => w.id === tc.workspace_id)?.name}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))
            )}
          </Paper>
        </DialogContent>

        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', px: 3, py: 2, gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {selectedTestCaseIds.length} test case{selectedTestCaseIds.length !== 1 ? 's' : ''} selected
          </Typography>
          <Button onClick={() => setCreateOpen(false)} variant="outlined">Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating || !runForm.name.trim()}
          >
            {creating ? 'Creating...' : 'Create Test Run'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
