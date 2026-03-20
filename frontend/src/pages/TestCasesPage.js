import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Paper, TextField, Button, Box, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, FormLabel, Select, MenuItem, Checkbox, FormControlLabel,
  FormGroup, RadioGroup, Radio, Grid, InputLabel, IconButton, Divider,
  Chip, Tooltip, InputAdornment, Collapse, Alert, Snackbar, TablePagination
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import { testCaseAPI, templateAPI, workspaceAPI, reportAPI } from '../services/api';
import UploadMappingDialog from '../components/UploadMappingDialog';

export default function TestCasesPage() {
  const [testCases, setTestCases] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    template_id: '',
    title: '',
    description: '',
    steps: '',
    expected_result: '',
    priority: 'Medium',
    section: '',
    type: 'Other',
    assigned_to: '',
    estimate: '',
    automation_type: 'None',
    is_automated: false,
    automation_candidate: 'None',
    references: '',
    preconditions: '',
  });
  const [fieldValues, setFieldValues] = useState({});
  const currentWorkspaceId = JSON.parse(localStorage.getItem('user') || '{}').workspace_id;

  useEffect(() => {
    loadWorkspaces();
    loadTestCases();
    loadTemplates();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const response = await workspaceAPI.getAll();
      setWorkspaces(response.data);
    } catch (error) {
      console.error('Error loading workspaces:', error);
    }
  };

  const handleSwitchWorkspace = async (workspaceId) => {
    try {
      await workspaceAPI.switch(workspaceId);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...user, workspace_id: workspaceId }));
      loadWorkspaces();
      loadTestCases();
      loadTemplates();
    } catch (error) {
      console.error('Error switching workspace:', error);
    }
  };

  const loadTestCases = async () => {
    try {
      const response = await testCaseAPI.getAll();
      setTestCases(response.data);
    } catch (error) {
      console.error('Error loading test cases:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await templateAPI.getAll();
      setTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const [fieldErrors] = useState({});
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [selectedTestCaseResults, setSelectedTestCaseResults] = useState(null);

  // ── Search & Filter ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('');

  // ── Bulk selection ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkEdits, setBulkEdits] = useState({ priority: '', status: '', template_id: '' });
  const [bulkMoveTarget, setBulkMoveTarget] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const handleOpenDialog = (testCase = null) => {
    if (testCase) {
      const fv = testCase.field_values || {};
      setEditingId(testCase.id);
      setFormData({
        template_id: testCase.template_id || '',
        title: testCase.title,
        description: testCase.description || '',
        steps: Array.isArray(testCase.steps) ? (testCase.steps || []).join('\n') : (testCase.steps || ''),
        expected_result: testCase.expected_result || '',
        priority: testCase.priority || 'Medium',
        section: fv.section || '',
        type: fv.type || 'Other',
        assigned_to: fv.assigned_to || '',
        estimate: fv.estimate || '',
        automation_type: fv.automation_type || 'None',
        is_automated: fv.is_automated || false,
        automation_candidate: fv.automation_candidate || 'None',
        references: fv.references || '',
        preconditions: fv.preconditions || '',
      });
      const { section, type, assigned_to, estimate, automation_type, is_automated, automation_candidate, references, preconditions, ...customFields } = fv;
      setFieldValues(customFields);
    } else {
      setEditingId(null);
      setFormData({
        template_id: '',
        title: '',
        description: '',
        steps: '',
        expected_result: '',
        priority: 'Medium',
        section: '',
        type: 'Other',
        assigned_to: '',
        estimate: '',
        automation_type: 'None',
        is_automated: false,
        automation_candidate: 'None',
        references: '',
        preconditions: '',
      });
      setFieldValues({});
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setFieldValues({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'template_id') {
      const selected = templates.find(t => t.id === Number(value));
      if (selected && selected.fields) {
        setFieldValues(buildDefaultFieldValues(selected.fields));
      } else {
        setFieldValues({});
      }
    }
  };

  const handleFieldValueChange = (name, value) => {
    setFieldValues(prev => ({ ...prev, [name]: value }));
  };

  const getSelectedTemplate = () => {
    return templates.find(t => t.id === Number(formData.template_id));
  };

  const buildDefaultFieldValues = (fields = []) => {
    return fields.reduce((acc, field) => {
      if (field.name) {
        acc[field.name] = field.default ?? (field.type === 'checkbox' ? false : '');
      }
      return acc;
    }, {});
  };

  const shouldShowField = (field) => {
    if (!field.condition || !field.condition.field) return true;
    const actual = fieldValues[field.condition.field];
    return String(actual) === String(field.condition.value);
  };

  const renderTemplateField = (field) => {
    if (!shouldShowField(field)) return null;

    const value = fieldValues[field.name] ?? field.default ?? '';
    const label = field.label || field.name;
    const error = fieldErrors[field.name];
    const isRequired = Boolean(field.required);

    switch (field.type) {
      case 'textarea':
        return (
          <TextField
            fullWidth
            label={label + (isRequired ? ' *' : '')}
            multiline
            rows={4}
            value={value}
            onChange={(e) => handleFieldValueChange(field.name, e.target.value)}
            error={Boolean(error)}
            helperText={error}
          />
        );
      case 'select':
        return (
          <FormControl fullWidth error={Boolean(error)}>
            <FormLabel>{label + (isRequired ? ' *' : '')}</FormLabel>
            <Select
              value={value}
              onChange={(e) => handleFieldValueChange(field.name, e.target.value)}
            >
              <MenuItem value="">(None)</MenuItem>
              {Array.isArray(field.options) && field.options.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
            {error && <Typography variant="caption" color="error">{error}</Typography>}
          </FormControl>
        );
      case 'radio':
        return (
          <FormControl component="fieldset" error={Boolean(error)}>
            <FormLabel component="legend">{label + (isRequired ? ' *' : '')}</FormLabel>
            <RadioGroup value={value} onChange={(e) => handleFieldValueChange(field.name, e.target.value)}>
              {Array.isArray(field.options) && field.options.map((opt) => (
                <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
              ))}
            </RadioGroup>
            {error && <Typography variant="caption" color="error">{error}</Typography>}
          </FormControl>
        );
      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(value)}
                onChange={(e) => handleFieldValueChange(field.name, e.target.checked)}
              />
            }
            label={label + (isRequired ? ' *' : '')}
          />
        );
      case 'checkboxGroup':
        return (
          <FormControl component="fieldset" error={Boolean(error)}>
            <FormLabel component="legend">{label + (isRequired ? ' *' : '')}</FormLabel>
            <FormGroup>
              {Array.isArray(field.options) && field.options.map((opt) => (
                <FormControlLabel
                  key={opt}
                  control={
                    <Checkbox
                      checked={Array.isArray(value) ? value.includes(opt) : false}
                      onChange={(e) => {
                        const next = Array.isArray(value) ? [...value] : [];
                        if (e.target.checked) {
                          next.push(opt);
                        } else {
                          const idx = next.indexOf(opt);
                          if (idx !== -1) next.splice(idx, 1);
                        }
                        handleFieldValueChange(field.name, next);
                      }}
                    />
                  }
                  label={opt}
                />
              ))}
            </FormGroup>
            {error && <Typography variant="caption" color="error">{error}</Typography>}
          </FormControl>
        );
      case 'number':
        return (
          <TextField
            fullWidth
            label={label + (isRequired ? ' *' : '')}
            type="number"
            value={value}
            onChange={(e) => handleFieldValueChange(field.name, e.target.value)}
            error={Boolean(error)}
            helperText={error}
          />
        );
      case 'date':
        return (
          <TextField
            fullWidth
            label={label + (isRequired ? ' *' : '')}
            type="date"
            value={value}
            onChange={(e) => handleFieldValueChange(field.name, e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={Boolean(error)}
            helperText={error}
          />
        );
      case 'button':
        return (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Array.isArray(field.options) && field.options.map((opt) => (
              <Button
                key={opt}
                variant={value === opt ? 'contained' : 'outlined'}
                onClick={() => handleFieldValueChange(field.name, opt)}
              >
                {opt}
              </Button>
            ))}
          </Box>
        );
      default:
        return (
          <TextField
            fullWidth
            label={label}
            value={value}
            onChange={(e) => handleFieldValueChange(field.name, e.target.value)}
          />
        );
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const stepsArray = formData.steps
        ? formData.steps.split('\n').map(s => s.trim()).filter(Boolean)
        : [];

      const data = {
        template_id: formData.template_id ? Number(formData.template_id) : null,
        title: formData.title,
        description: formData.description,
        steps: stepsArray,
        expected_result: formData.expected_result,
        priority: formData.priority,
        field_values: {
          ...fieldValues,
          section: formData.section,
          type: formData.type,
          assigned_to: formData.assigned_to,
          estimate: formData.estimate,
          automation_type: formData.automation_type,
          is_automated: formData.is_automated,
          automation_candidate: formData.automation_candidate,
          references: formData.references,
          preconditions: formData.preconditions,
        },
        change_reason: editingId ? 'Updated test case' : undefined
      };

      if (editingId) {
        await testCaseAPI.update(editingId, data);
      } else {
        await testCaseAPI.create(data);
      }

      handleCloseDialog();
      loadTestCases();
    } catch (error) {
      console.error('Error saving test case:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await testCaseAPI.delete(id);
        loadTestCases();
      } catch (error) {
        console.error('Error deleting test case:', error);
      }
    }
  };

  const handleViewResults = async (testCase) => {
    try {
      const response = await reportAPI.getTestCaseResults(testCase.id);
      setSelectedTestCaseResults({ testCase, results: response.data });
      setResultsDialogOpen(true);
    } catch (error) {
      console.error('Error loading test case results:', error);
    }
  };

  const handleClone = async (testCase) => {
    try {
      await testCaseAPI.clone(testCase.id);
      loadTestCases();
    } catch (error) {
      console.error('Error cloning test case:', error);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filteredCases = useMemo(() => {
    return testCases.filter(tc => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        tc.title?.toLowerCase().includes(q) ||
        tc.priority?.toLowerCase().includes(q) ||
        tc.status?.toLowerCase().includes(q) ||
        (tc.field_values?.section || '').toLowerCase().includes(q);
      const matchPriority = !filterPriority || tc.priority === filterPriority;
      const matchStatus = !filterStatus || tc.status === filterStatus;
      const matchTemplate = !filterTemplate ||
        String(tc.template_id) === String(filterTemplate);
      return matchSearch && matchPriority && matchStatus && matchTemplate;
    });
  }, [testCases, searchQuery, filterPriority, filterStatus, filterTemplate]);

  // Reset to page 0 when filters change
  useEffect(() => { setPage(0); }, [searchQuery, filterPriority, filterStatus, filterTemplate]);

  const activeFilterCount = [filterPriority, filterStatus, filterTemplate].filter(Boolean).length;
  const pagedCases = filteredCases.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const allSelected = filteredCases.length > 0 && filteredCases.every(tc => selectedIds.includes(tc.id));
  const someSelected = selectedIds.length > 0;

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelectedIds(allSelected ? [] : filteredCases.map(tc => tc.id));

  const clearFilters = () => {
    setSearchQuery(''); setFilterPriority(''); setFilterStatus(''); setFilterTemplate('');
  };

  const showSnack = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  const handleBulkDelete = async () => {
    try {
      await testCaseAPI.bulkDelete(selectedIds);
      setConfirmDeleteOpen(false);
      const count = selectedIds.length;
      setSelectedIds([]);
      loadTestCases();
      showSnack(`${count} test cases deleted`);
    } catch (e) {
      console.error('Bulk delete error:', e);
      showSnack('Delete failed: ' + (e.response?.data?.error || e.message), 'error');
    }
  };

  const handleBulkEdit = async () => {
    const updates = {};
    if (bulkEdits.priority) updates.priority = bulkEdits.priority;
    if (bulkEdits.status) updates.status = bulkEdits.status;
    if (bulkEdits.template_id !== '') updates.template_id = bulkEdits.template_id || null;
    if (!Object.keys(updates).length) return;
    try {
      await testCaseAPI.bulkUpdate(selectedIds, updates);
      setBulkEditOpen(false);
      setBulkEdits({ priority: '', status: '', template_id: '' });
      setSelectedIds([]);
      loadTestCases();
      showSnack(`${selectedIds.length} test cases updated`);
    } catch (e) { showSnack('Update failed', 'error'); }
  };

  const handleBulkMove = async () => {
    if (!bulkMoveTarget) return;
    try {
      await testCaseAPI.bulkMove(selectedIds, Number(bulkMoveTarget));
      setBulkMoveOpen(false);
      setBulkMoveTarget('');
      setSelectedIds([]);
      loadTestCases();
      showSnack(`${selectedIds.length} test cases moved`);
    } catch (e) { showSnack('Move failed', 'error'); }
  };

  const PRIORITY_COLORS = {
    Critical: { bg: '#fee2e2', color: '#dc2626' },
    P0:       { bg: '#fee2e2', color: '#dc2626' },
    High:     { bg: '#ffedd5', color: '#ea580c' },
    P1:       { bg: '#ffedd5', color: '#ea580c' },
    Medium:   { bg: '#fef9c3', color: '#ca8a04' },
    P2:       { bg: '#fef9c3', color: '#ca8a04' },
    Low:      { bg: '#dcfce7', color: '#16a34a' },
    P3:       { bg: '#dcfce7', color: '#16a34a' },
  };

  const selectedTemplate = getSelectedTemplate();

  return (
    <Box sx={{ bgcolor: '#f4f6f9', minHeight: '100vh' }}>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────────── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1a3d2b 0%, #225038 60%, #2d6a4f 100%)',
        px: { xs: 3, md: 5 }, pt: 3.5, pb: 4,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
              Test Management
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
              Test Cases
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
              {testCases.length} total · {filteredCases.length} shown
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Project selector */}
            <FormControl size="small">
              <Select
                value={currentWorkspaceId || ''}
                onChange={(e) => handleSwitchWorkspace(Number(e.target.value))}
                displayEmpty
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: 13,
                  minWidth: 140, '& fieldset': { border: '1px solid rgba(255,255,255,0.2)' },
                  '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' }
                }}
              >
                {workspaces.map(ws => <MenuItem key={ws.id} value={ws.id} sx={{ fontSize: 13 }}>{ws.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
              onClick={() => setUploadOpen(true)}
              sx={{ borderRadius: '10px', borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.9)', fontSize: 13,
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
              Import
            </Button>
            <Button variant="contained" onClick={() => handleOpenDialog()}
              sx={{ bgcolor: 'white', color: '#225038', fontWeight: 700, borderRadius: '10px', fontSize: 13,
                '&:hover': { bgcolor: '#f0fdf4' } }}>
              + Create Test Case
            </Button>
          </Box>
        </Box>
      </Box>

      <Container maxWidth="xl" sx={{ py: 3 }}>

        {/* ── SEARCH + FILTER BAR ─────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', mb: 2 }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search test cases…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              size="small"
              sx={{ width: 220,
                '& .MuiOutlinedInput-root': { borderRadius: '9px', fontSize: 13, bgcolor: '#f8fafc',
                  '&:hover fieldset': { borderColor: '#225038' },
                  '&.Mui-focused fieldset': { borderColor: '#225038' } }
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment>,
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}><ClearIcon sx={{ fontSize: 14 }} /></IconButton>
                  </InputAdornment>
                ) : null
              }}
            />

            <Divider orientation="vertical" flexItem />

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} displayEmpty
                sx={{ borderRadius: '9px', fontSize: 13, bgcolor: filterPriority ? '#f0fdf4' : 'transparent',
                  '& fieldset': { borderColor: filterPriority ? '#86efac' : undefined } }}>
                <MenuItem value="" sx={{ fontSize: 13 }}>Priority</MenuItem>
                {['Critical','High','Medium','Low','P0','P1','P2','P3'].map(p =>
                  <MenuItem key={p} value={p} sx={{ fontSize: 13 }}>{p}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 110 }}>
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} displayEmpty
                sx={{ borderRadius: '9px', fontSize: 13, bgcolor: filterStatus ? '#f0fdf4' : 'transparent',
                  '& fieldset': { borderColor: filterStatus ? '#86efac' : undefined } }}>
                <MenuItem value="" sx={{ fontSize: 13 }}>Status</MenuItem>
                {['Draft','Active','Deprecated'].map(s =>
                  <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{s}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select value={filterTemplate} onChange={e => setFilterTemplate(e.target.value)} displayEmpty
                sx={{ borderRadius: '9px', fontSize: 13, bgcolor: filterTemplate ? '#f0fdf4' : 'transparent',
                  '& fieldset': { borderColor: filterTemplate ? '#86efac' : undefined } }}>
                <MenuItem value="" sx={{ fontSize: 13 }}>Template</MenuItem>
                {templates.map(t => <MenuItem key={t.id} value={t.id} sx={{ fontSize: 13 }}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>

            {activeFilterCount > 0 && (
              <Button size="small" startIcon={<ClearIcon sx={{ fontSize: 13 }} />} onClick={clearFilters}
                sx={{ borderRadius: '8px', color: '#dc2626', fontSize: 12, fontWeight: 600,
                  bgcolor: '#fee2e2', '&:hover': { bgcolor: '#fecaca' }, px: 1.5, py: 0.5 }}>
                Clear ({activeFilterCount})
              </Button>
            )}

            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
              {activeFilterCount > 0 || searchQuery ? (
                <Chip label={`${filteredCases.length} of ${testCases.length}`} size="small"
                  sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: 11 }} />
              ) : (
                <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                  {testCases.length} total
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>

        {/* ── BULK ACTION BAR ─────────────────────────────────────────────── */}
        <Collapse in={someSelected}>
          <Paper elevation={0} sx={{
            mb: 2, border: '1.5px solid #86efac', borderRadius: '12px', bgcolor: '#f0fdf4',
            px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap'
          }}>
            <Chip label={`${selectedIds.length} selected`} size="small"
              sx={{ bgcolor: '#225038', color: 'white', fontWeight: 700, fontSize: 12 }} />
            <Divider orientation="vertical" flexItem />
            <Button size="small" startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => setBulkEditOpen(true)}
              sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 600, color: '#225038',
                bgcolor: 'white', border: '1px solid #86efac', '&:hover': { bgcolor: '#dcfce7' } }}>
              Bulk Edit
            </Button>
            <Button size="small" startIcon={<DriveFileMoveOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => setBulkMoveOpen(true)}
              sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 600, color: '#2563eb',
                bgcolor: 'white', border: '1px solid #bfdbfe', '&:hover': { bgcolor: '#dbeafe' } }}>
              Move to Project
            </Button>
            <Button size="small" startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
              onClick={() => setConfirmDeleteOpen(true)}
              sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 600, color: '#dc2626',
                bgcolor: 'white', border: '1px solid #fecaca', '&:hover': { bgcolor: '#fee2e2' } }}>
              Delete Selected
            </Button>
            <Button size="small" onClick={() => setSelectedIds([])}
              sx={{ ml: 'auto', fontSize: 12, color: 'text.secondary', borderRadius: '8px' }}>
              Deselect all
            </Button>
          </Paper>
        </Collapse>

        {/* ── TABLE ───────────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell padding="checkbox" sx={{ pl: 2 }}>
                    <Tooltip title={allSelected ? 'Deselect all' : 'Select all'}>
                      <Checkbox
                        size="small"
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={toggleAll}
                        sx={{ '&.Mui-checked': { color: '#225038' }, '&.MuiCheckbox-indeterminate': { color: '#225038' } }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', width: 80 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>Template</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', pr: 3 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <CheckBoxOutlineBlankIcon sx={{ fontSize: 40, color: '#e2e8f0', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary' }}>
                        {searchQuery || activeFilterCount > 0 ? 'No test cases match your filters' : 'No test cases yet'}
                      </Typography>
                      {(searchQuery || activeFilterCount > 0) && (
                        <Button size="small" onClick={clearFilters} sx={{ mt: 1, color: '#225038', fontSize: 12 }}>
                          Clear filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : pagedCases.map((tc, idx) => {
                  const isSelected = selectedIds.includes(tc.id);
                  const pColor = PRIORITY_COLORS[tc.priority] || { bg: '#f1f5f9', color: '#64748b' };
                  return (
                    <TableRow key={tc.id}
                      sx={{
                        bgcolor: isSelected ? '#f0fdf4' : 'white',
                        '&:hover': { bgcolor: isSelected ? '#dcfce7' : '#f8fffe' },
                        borderLeft: isSelected ? '3px solid #225038' : '3px solid transparent',
                        transition: 'background 0.12s',
                      }}>
                      <TableCell padding="checkbox" sx={{ pl: 2 }}>
                        <Checkbox size="small" checked={isSelected} onChange={() => toggleSelect(tc.id)}
                          sx={{ '&.Mui-checked': { color: '#225038' } }} />
                      </TableCell>
                      <TableCell sx={{ py: 1.2, width: 80 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8',
                          bgcolor: '#f1f5f9', px: 1, py: 0.3, borderRadius: '5px', display: 'inline-block',
                          fontFamily: 'monospace', letterSpacing: 0.5 }}>
                          TC-{tc.id}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', cursor: 'pointer',
                          '&:hover': { color: '#225038', textDecoration: 'underline' } }}
                          onClick={() => handleOpenDialog(tc)}>
                          {tc.title}
                        </Typography>
                        {tc.field_values?.section && (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.2 }}>
                            {tc.field_values.section}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {templates.find(t => t.id === tc.template_id)?.name || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        {tc.priority ? (
                          <Chip label={tc.priority} size="small"
                            sx={{ bgcolor: pColor.bg, color: pColor.color, fontWeight: 700, fontSize: 11, height: 20, borderRadius: '5px' }} />
                        ) : <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>—</Typography>}
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Chip label={tc.status || 'Draft'} size="small"
                          sx={{
                            bgcolor: tc.status === 'Active' ? '#dcfce7' : tc.status === 'Deprecated' ? '#fee2e2' : '#f1f5f9',
                            color: tc.status === 'Active' ? '#15803d' : tc.status === 'Deprecated' ? '#dc2626' : '#64748b',
                            fontWeight: 600, fontSize: 11, height: 20, borderRadius: '5px'
                          }} />
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 2, py: 1, whiteSpace: 'nowrap' }}>
                        <Tooltip title="Edit">
                          <Button size="small" onClick={() => handleOpenDialog(tc)}
                            sx={{ minWidth: 32, width: 32, height: 28, p: 0, borderRadius: '7px', color: '#225038',
                              border: '1px solid #e2e8f0', mr: 0.5, '&:hover': { bgcolor: '#f0fdf4', borderColor: '#86efac' } }}>
                            <EditOutlinedIcon sx={{ fontSize: 15 }} />
                          </Button>
                        </Tooltip>
                        <Tooltip title="Results">
                          <Button size="small" onClick={() => handleViewResults(tc)}
                            sx={{ minWidth: 32, width: 32, height: 28, p: 0, borderRadius: '7px', color: '#2563eb',
                              border: '1px solid #e2e8f0', mr: 0.5, '&:hover': { bgcolor: '#dbeafe', borderColor: '#93c5fd' } }}>
                            <FilterListIcon sx={{ fontSize: 15 }} />
                          </Button>
                        </Tooltip>
                        <Tooltip title="Clone">
                          <Button size="small" onClick={() => handleClone(tc)}
                            sx={{ minWidth: 32, width: 32, height: 28, p: 0, borderRadius: '7px', color: '#7c3aed',
                              border: '1px solid #e2e8f0', mr: 0.5, '&:hover': { bgcolor: '#f3e8ff', borderColor: '#c4b5fd' } }}>
                            <Typography sx={{ fontSize: 13, lineHeight: 1 }}>⎘</Typography>
                          </Button>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <Button size="small" onClick={() => handleDelete(tc.id)}
                            sx={{ minWidth: 32, width: 32, height: 28, p: 0, borderRadius: '7px', color: '#dc2626',
                              border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#fee2e2', borderColor: '#fca5a5' } }}>
                            <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredCases.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage="Per page:"
            sx={{
              borderTop: '1px solid', borderColor: 'divider',
              '& .MuiTablePagination-toolbar': { px: 2 },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 12 },
            }}
          />
        </Paper>

        {/* ── CONFIRM DELETE DIALOG ─────────────────────────────────────────── */}
        <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ pb: 1 }}>
            <Typography fontWeight={700}>Delete {selectedIds.length} Test Case{selectedIds.length !== 1 ? 's' : ''}?</Typography>
          </DialogTitle>
          <DialogContent>
            <Typography color="text.secondary" sx={{ fontSize: 14 }}>
              This will permanently delete <strong>{selectedIds.length}</strong> test case{selectedIds.length !== 1 ? 's' : ''}. This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button onClick={() => setConfirmDeleteOpen(false)} sx={{ borderRadius: '10px' }}>Cancel</Button>
            <Button onClick={handleBulkDelete} variant="contained" color="error"
              sx={{ borderRadius: '10px', fontWeight: 700 }}>
              Delete {selectedIds.length} case{selectedIds.length !== 1 ? 's' : ''}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── BULK EDIT DIALOG ─────────────────────────────────────────────── */}
        <Dialog open={bulkEditOpen} onClose={() => setBulkEditOpen(false)} maxWidth="sm" fullWidth
          PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Bulk Edit</Typography>
              <Typography variant="caption" color="text.disabled">Editing {selectedIds.length} test case(s) — only filled fields will be updated</Typography>
            </Box>
            <IconButton size="small" onClick={() => setBulkEditOpen(false)}><CloseIcon fontSize="small" /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3, pb: 2 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select value={bulkEdits.priority} label="Priority"
                    onChange={e => setBulkEdits(p => ({ ...p, priority: e.target.value }))}
                    sx={{ borderRadius: '10px' }}>
                    <MenuItem value="">— Keep existing —</MenuItem>
                    {['Critical','High','Medium','Low','P0','P1','P2','P3'].map(p =>
                      <MenuItem key={p} value={p}>{p}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={bulkEdits.status} label="Status"
                    onChange={e => setBulkEdits(p => ({ ...p, status: e.target.value }))}
                    sx={{ borderRadius: '10px' }}>
                    <MenuItem value="">— Keep existing —</MenuItem>
                    {['Draft','Active','Deprecated'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Template</InputLabel>
                  <Select value={bulkEdits.template_id} label="Template"
                    onChange={e => setBulkEdits(p => ({ ...p, template_id: e.target.value }))}
                    sx={{ borderRadius: '10px' }}>
                    <MenuItem value="">— Keep existing —</MenuItem>
                    <MenuItem value={null}>No template</MenuItem>
                    {templates.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
            <Button onClick={() => setBulkEditOpen(false)} sx={{ borderRadius: '10px' }}>Cancel</Button>
            <Button onClick={handleBulkEdit} variant="contained"
              sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#1a3d2b' } }}>
              Apply to {selectedIds.length} cases
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── BULK MOVE DIALOG ─────────────────────────────────────────────── */}
        <Dialog open={bulkMoveOpen} onClose={() => setBulkMoveOpen(false)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Move to Project</Typography>
              <Typography variant="caption" color="text.disabled">Moving {selectedIds.length} test case(s)</Typography>
            </Box>
            <IconButton size="small" onClick={() => setBulkMoveOpen(false)}><CloseIcon fontSize="small" /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3, pb: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Target Project</InputLabel>
              <Select value={bulkMoveTarget} label="Target Project"
                onChange={e => setBulkMoveTarget(e.target.value)}
                sx={{ borderRadius: '10px' }}>
                <MenuItem value="">Select project…</MenuItem>
                {workspaces.filter(ws => ws.id !== currentWorkspaceId).map(ws =>
                  <MenuItem key={ws.id} value={ws.id}>{ws.name}</MenuItem>)}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
            <Button onClick={() => setBulkMoveOpen(false)} sx={{ borderRadius: '10px' }}>Cancel</Button>
            <Button onClick={handleBulkMove} variant="contained" disabled={!bulkMoveTarget}
              sx={{ bgcolor: '#2563eb', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#1d4ed8' } }}>
              Move {selectedIds.length} cases
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── SNACKBAR ─────────────────────────────────────────────────────── */}
        <Snackbar open={snackbar.open} autoHideDuration={3500}
          onClose={() => setSnackbar(p => ({ ...p, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity={snackbar.severity} sx={{ borderRadius: '12px', fontWeight: 600 }}
            onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>

      {/* ── TestRail-style Create / Edit Dialog ── */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth
        PaperProps={{ sx: { minHeight: '85vh' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: 1, borderColor: 'divider', pb: 2 }}>
          <Typography variant="h6">{editingId ? 'Edit Test Case' : 'Add Test Case'}</Typography>
          <IconButton size="small" onClick={handleCloseDialog}><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {/* Title */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
              Title <span style={{ color: 'red' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter test case title"
              size="small"
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Row 1: Section | Template | Type | Priority */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Section</InputLabel>
                <Select
                  value={formData.section}
                  label="Section"
                  onChange={(e) => setFormData(p => ({ ...p, section: e.target.value }))}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Functional Tests">Functional Tests</MenuItem>
                  <MenuItem value="Performance Tests">Performance Tests</MenuItem>
                  <MenuItem value="Regression Tests">Regression Tests</MenuItem>
                  <MenuItem value="Smoke Tests">Smoke Tests</MenuItem>
                  <MenuItem value="Integration Tests">Integration Tests</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Template</InputLabel>
                <Select
                  name="template_id"
                  value={formData.template_id}
                  label="Template"
                  onChange={handleChange}
                >
                  <MenuItem value="">(No template)</MenuItem>
                  {templates.map(t => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type <span style={{ color: 'red' }}>*</span></InputLabel>
                <Select
                  value={formData.type}
                  label="Type *"
                  onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
                >
                  <MenuItem value="Other">Other</MenuItem>
                  <MenuItem value="Automated">Automated</MenuItem>
                  <MenuItem value="Functional">Functional</MenuItem>
                  <MenuItem value="Regression">Regression</MenuItem>
                  <MenuItem value="Performance">Performance</MenuItem>
                  <MenuItem value="Smoke">Smoke</MenuItem>
                  <MenuItem value="Usability">Usability</MenuItem>
                  <MenuItem value="Acceptance">Acceptance</MenuItem>
                  <MenuItem value="Accessibility">Accessibility</MenuItem>
                  <MenuItem value="Security">Security</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority <span style={{ color: 'red' }}>*</span></InputLabel>
                <Select
                  name="priority"
                  value={formData.priority}
                  label="Priority *"
                  onChange={handleChange}
                >
                  <MenuItem value="Critical">Critical</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="Low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Row 2: Assigned To | Estimate | Automation Type | Is Automated */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Assigned To</InputLabel>
                <Select
                  value={formData.assigned_to}
                  label="Assigned To"
                  onChange={(e) => setFormData(p => ({ ...p, assigned_to: e.target.value }))}
                >
                  <MenuItem value="">None</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Estimate"
                value={formData.estimate}
                onChange={(e) => setFormData(p => ({ ...p, estimate: e.target.value }))}
                placeholder="e.g. 30s or 1m 45s"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Automation Type</InputLabel>
                <Select
                  value={formData.automation_type}
                  label="Automation Type"
                  onChange={(e) => setFormData(p => ({ ...p, automation_type: e.target.value }))}
                >
                  <MenuItem value="None">None</MenuItem>
                  <MenuItem value="Selenium">Selenium</MenuItem>
                  <MenuItem value="Playwright">Playwright</MenuItem>
                  <MenuItem value="Cypress">Cypress</MenuItem>
                  <MenuItem value="Ranorex">Ranorex</MenuItem>
                  <MenuItem value="TestComplete">TestComplete</MenuItem>
                  <MenuItem value="Custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1, height: '100%',
                display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={Boolean(formData.is_automated)}
                      onChange={(e) => setFormData(p => ({ ...p, is_automated: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Is Automated</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        defines if this test has been automated by external tool/script.
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
              </Box>
            </Grid>
          </Grid>

          {/* Automation Candidate */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>Automation Candidate</Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={formData.automation_candidate}
                onChange={(e) => setFormData(p => ({ ...p, automation_candidate: e.target.value }))}
              >
                <MenuItem value="None">None</MenuItem>
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              is a candidate for automation?
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* References */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>References</Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              size="small"
              placeholder="Start typing"
              value={formData.references}
              onChange={(e) => setFormData(p => ({ ...p, references: e.target.value }))}
              inputProps={{ maxLength: 2000 }}
              helperText={`${(formData.references || '').length} / 2000`}
              FormHelperTextProps={{ sx: { textAlign: 'right', mr: 0 } }}
            />
          </Box>

          {/* Preconditions */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>Preconditions</Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              size="small"
              placeholder="Describe any preconditions for this test case"
              value={formData.preconditions}
              onChange={(e) => setFormData(p => ({ ...p, preconditions: e.target.value }))}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              The preconditions of this test case. Reference other test cases with [C#] (e.g. [C17]).
            </Typography>
          </Box>

          {/* Steps */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>Steps</Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              size="small"
              name="steps"
              value={formData.steps}
              onChange={handleChange}
              placeholder={"Step 1\nStep 2\nStep 3"}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              The required steps to execute the test case.
            </Typography>
          </Box>

          {/* Expected Result */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>Expected Result</Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              size="small"
              name="expected_result"
              value={formData.expected_result}
              onChange={handleChange}
              placeholder="Describe the expected outcome"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              The expected result after executing the test case.
            </Typography>
          </Box>

          {/* Template custom fields */}
          {selectedTemplate && selectedTemplate.fields && selectedTemplate.fields.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Template Fields — {selectedTemplate.name}
              </Typography>
              {selectedTemplate.fields.map((field) => (
                <Box key={field.name} sx={{ mb: 2 }}>
                  {renderTemplateField(field)}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={<span>✓</span>}
          >
            {loading ? 'Saving...' : 'Save Test Case'}
          </Button>
          {!editingId && (
            <Button
              onClick={async () => { await handleSubmit(); }}
              variant="contained"
              disabled={loading}
              startIcon={<span>✓</span>}
            >
              Save Test Case &amp; Next
            </Button>
          )}
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            color="error"
            startIcon={<span>✕</span>}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultsDialogOpen} onClose={() => setResultsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test Case Results</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedTestCaseResults ? (
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {selectedTestCaseResults.testCase.title}
              </Typography>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                {selectedTestCaseResults.testCase.description}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Total executions: {selectedTestCaseResults.results.total}
              </Typography>
              {['Pass', 'Fail', 'Skip', 'Not Started'].map((key) => {
                const count = selectedTestCaseResults.results.counts[key] || 0;
                const percentage = selectedTestCaseResults.results.total
                  ? Math.round((count / selectedTestCaseResults.results.total) * 100)
                  : 0;
                const paletteColor = key === 'Pass' ? 'success.main' : key === 'Fail' ? 'error.main' : key === 'Skip' ? 'warning.main' : 'grey.500';
                return (
                  <Box key={key} sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      {key}: {count} ({percentage}%)
                    </Typography>
                    <Box sx={{ backgroundColor: 'grey.200', borderRadius: 1, height: 12 }}>
                      <Box sx={{ width: `${percentage}%`, height: '100%', backgroundColor: paletteColor, borderRadius: 1 }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Typography>Loading results...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <UploadMappingDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={loadTestCases}
      />
    </Box>
  );
}
