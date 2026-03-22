import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Paper, TextField, Button, Box, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, FormLabel, Select, MenuItem, Checkbox, FormControlLabel,
  FormGroup, RadioGroup, Radio, Grid, InputLabel, IconButton, Divider,
  Chip, Tooltip, InputAdornment, Alert, Snackbar, TablePagination, Popover,
  Drawer, Tabs, Tab, CircularProgress
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
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { testCaseAPI, templateAPI, workspaceAPI, reportAPI, enrichAPI, defectAPI } from '../services/api';
import UploadMappingDialog from '../components/UploadMappingDialog';
import CommentThread from '../components/CommentThread';
import AttachmentPanel from '../components/AttachmentPanel';
import VersionHistory from '../components/VersionHistory';

export default function TestCasesPage() {
  const [testCases, setTestCases] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [autoStats, setAutoStats] = useState({ total: 0, automated: 0, pending: 0, pct: 0 });
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
    priority: 'P2',
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
  const [enriching, setEnriching] = useState(false);
  const [enrichPreview, setEnrichPreview] = useState(null);
  const [colAnchor, setColAnchor] = useState(null);
  const [visibleCols, setVisibleCols] = useState({
    template: true, priority: true, status: true, automated: true, section: false, type: false,
  });
  const toggleCol = (key) => setVisibleCols(p => ({ ...p, [key]: !p[key] }));
  const currentWorkspaceId = JSON.parse(localStorage.getItem('user') || '{}').workspace_id;

  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichPreview(null);
    try {
      const r = await enrichAPI.enrich({
        title: formData.title,
        description: formData.description,
        steps: formData.steps,
        expected_result: formData.expected_result,
        preconditions: formData.preconditions,
      });
      setEnrichPreview(r.data.enriched);
    } catch (e) {
      console.error('Enrichment error:', e);
    } finally {
      setEnriching(false);
    }
  };

  const applyEnrichment = () => {
    if (!enrichPreview) return;
    setFormData(prev => ({
      ...prev,
      title: enrichPreview.title || prev.title,
      description: enrichPreview.description || prev.description,
      steps: Array.isArray(enrichPreview.steps)
        ? enrichPreview.steps.join('\n')
        : (enrichPreview.steps || prev.steps),
      expected_result: enrichPreview.expected_result || prev.expected_result,
      preconditions: enrichPreview.preconditions || prev.preconditions,
    }));
    setEnrichPreview(null);
  };

  const loadAutoStats = async () => {
    try {
      const r = await reportAPI.getAutomation();
      setAutoStats(r.data);
    } catch (e) { console.error('Error loading automation stats:', e); }
  };

  useEffect(() => {
    loadWorkspaces();
    loadTestCases();
    loadTemplates();
    loadAutoStats();
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

  // Detail drawer state
  const [drawerTc, setDrawerTc] = useState(null);
  const [drawerTab, setDrawerTab] = useState(0);
  const [drawerDefects, setDrawerDefects] = useState([]);
  const [drawerDefectsLoading, setDrawerDefectsLoading] = useState(false);

  const openDrawer = (tc) => {
    setDrawerTc(tc);
    setDrawerTab(0);
    setDrawerDefects([]);
  };

  const loadDrawerDefects = async (tcId) => {
    setDrawerDefectsLoading(true);
    try {
      const r = await defectAPI.getAll({ test_case_id: tcId });
      setDrawerDefects(r.data || []);
    } catch (e) { console.error(e); }
    finally { setDrawerDefectsLoading(false); }
  };

  useEffect(() => {
    if (drawerTc && drawerTab === 4) {
      loadDrawerDefects(drawerTc.id);
    }
  }, [drawerTc, drawerTab]);

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

  // ── Resizable columns ──────────────────────────────────────────────────────
  const [colWidths, setColWidths] = useState({ id: 96, title: 480, template: 150, priority: 110, status: 110, actions: 165 });
  const startResize = (col, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[col];
    const onMove = (me) => {
      setColWidths(prev => ({ ...prev, [col]: Math.max(60, startW + me.clientX - startX) }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

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
    setEnrichPreview(null);
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
      loadAutoStats();
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

  const handleToggleAutomation = async (tc) => {
    const current = tc.field_values?.is_automated === true || tc.field_values?.is_automated === 'true';
    try {
      await testCaseAPI.update(tc.id, {
        title: tc.title,
        description: tc.description,
        steps: tc.steps,
        expected_result: tc.expected_result,
        priority: tc.priority,
        field_values: { ...(tc.field_values || {}), is_automated: !current },
      });
      loadTestCases();
      loadAutoStats();
      showSnack(`TC-${tc.id} marked as ${!current ? 'Automated' : 'Manual'}`);
    } catch (e) {
      showSnack('Update failed', 'error');
    }
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
          {/* ── Automation stats strip ── */}
          {(() => {
            const autoCount = autoStats.automated;
            const pendingCount = autoStats.pending;
            const autoPct = autoStats.pct;
            return autoStats.total > 0 ? (
              <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <SmartToyOutlinedIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Automation Coverage
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, ml: 'auto' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#4ade80' }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{autoCount} Automated</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.3)' }} />
                      <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{pendingCount} Pending</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: autoPct >= 70 ? '#4ade80' : autoPct >= 40 ? '#fbbf24' : '#f87171' }}>
                      {autoPct}%
                    </Typography>
                  </Box>
                </Box>
                {/* Progress bar */}
                <Box sx={{ display: 'flex', height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                  <Box sx={{
                    width: `${autoPct}%`,
                    background: 'linear-gradient(90deg, #4ade80, #22c55e)',
                    borderRadius: 3, transition: 'width 0.6s ease',
                  }} />
                </Box>
              </Box>
            ) : null;
          })()}
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

        {/* ── UNIFIED SINGLE-ROW TOOLBAR ──────────────────────────────────── */}
        <Paper elevation={0} sx={{
          border: someSelected ? '1.5px solid #4ade80' : '1px solid #e2e8f0',
          borderRadius: '14px', mb: 2,
          background: someSelected
            ? 'linear-gradient(90deg, #f0fdf4 0%, #fafffe 100%)'
            : 'linear-gradient(90deg, #f8fffe 0%, #ffffff 100%)',
          transition: 'all 0.2s ease',
          overflow: 'hidden',
        }}>
          <Box sx={{ px: 2, py: 1.4, display: 'flex', gap: 1, alignItems: 'center' }}>

            {/* ── SEARCH ── */}
            <TextField
              placeholder="Search test cases…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              size="small"
              sx={{ width: 195, flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '9px', fontSize: 13,
                  bgcolor: searchQuery ? 'rgba(34,80,56,0.06)' : '#f1f5f9',
                  '& fieldset': { borderColor: searchQuery ? '#225038' : '#e2e8f0', borderWidth: searchQuery ? 1.5 : 1 },
                  '&:hover fieldset': { borderColor: '#225038' },
                  '&.Mui-focused fieldset': { borderColor: '#225038', borderWidth: 2 },
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 15, color: searchQuery ? '#225038' : '#94a3b8' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}><ClearIcon sx={{ fontSize: 13 }} /></IconButton>
                  </InputAdornment>
                ) : null
              }}
            />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: '#e2e8f0' }} />

            {/* ── PRIORITY FILTER ── */}
            <FormControl size="small" sx={{ minWidth: 105, flexShrink: 0 }}>
              <Select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} displayEmpty
                sx={{
                  borderRadius: '9px', fontSize: 13,
                  bgcolor: filterPriority ? 'rgba(34,80,56,0.08)' : '#f1f5f9',
                  fontWeight: filterPriority ? 700 : 400,
                  color: filterPriority ? '#225038' : 'inherit',
                  '& fieldset': { borderColor: filterPriority ? '#225038' : '#e2e8f0', borderWidth: filterPriority ? 1.5 : 1 },
                  '&:hover fieldset': { borderColor: '#225038' },
                  '& .MuiSvgIcon-root': { color: filterPriority ? '#225038' : '#94a3b8' },
                }}>
                <MenuItem value="" sx={{ fontSize: 13, color: '#94a3b8' }}>Priority</MenuItem>
                {['P0','P1','P2','P3','Critical','High','Medium','Low'].map(p =>
                  <MenuItem key={p} value={p} sx={{ fontSize: 13 }}>{p}</MenuItem>)}
              </Select>
            </FormControl>

            {/* ── STATUS FILTER ── */}
            <FormControl size="small" sx={{ minWidth: 100, flexShrink: 0 }}>
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} displayEmpty
                sx={{
                  borderRadius: '9px', fontSize: 13,
                  bgcolor: filterStatus ? 'rgba(34,80,56,0.08)' : '#f1f5f9',
                  fontWeight: filterStatus ? 700 : 400,
                  color: filterStatus ? '#225038' : 'inherit',
                  '& fieldset': { borderColor: filterStatus ? '#225038' : '#e2e8f0', borderWidth: filterStatus ? 1.5 : 1 },
                  '&:hover fieldset': { borderColor: '#225038' },
                  '& .MuiSvgIcon-root': { color: filterStatus ? '#225038' : '#94a3b8' },
                }}>
                <MenuItem value="" sx={{ fontSize: 13, color: '#94a3b8' }}>Status</MenuItem>
                {['Draft','Active','Deprecated'].map(s =>
                  <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{s}</MenuItem>)}
              </Select>
            </FormControl>

            {/* ── TEMPLATE FILTER ── */}
            <FormControl size="small" sx={{ minWidth: 115, flexShrink: 0 }}>
              <Select value={filterTemplate} onChange={e => setFilterTemplate(e.target.value)} displayEmpty
                sx={{
                  borderRadius: '9px', fontSize: 13,
                  bgcolor: filterTemplate ? 'rgba(34,80,56,0.08)' : '#f1f5f9',
                  fontWeight: filterTemplate ? 700 : 400,
                  color: filterTemplate ? '#225038' : 'inherit',
                  '& fieldset': { borderColor: filterTemplate ? '#225038' : '#e2e8f0', borderWidth: filterTemplate ? 1.5 : 1 },
                  '&:hover fieldset': { borderColor: '#225038' },
                  '& .MuiSvgIcon-root': { color: filterTemplate ? '#225038' : '#94a3b8' },
                }}>
                <MenuItem value="" sx={{ fontSize: 13, color: '#94a3b8' }}>Template</MenuItem>
                {templates.map(t => <MenuItem key={t.id} value={t.id} sx={{ fontSize: 13 }}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>

            {activeFilterCount > 0 && (
              <Button size="small" startIcon={<ClearIcon sx={{ fontSize: 12 }} />} onClick={clearFilters}
                sx={{ borderRadius: '8px', color: '#dc2626', fontSize: 11, fontWeight: 700,
                  bgcolor: '#fee2e2', border: '1px solid #fca5a5', flexShrink: 0,
                  '&:hover': { bgcolor: '#fecaca' }, px: 1.2, py: 0.4, minWidth: 0 }}>
                Clear
              </Button>
            )}

            {/* ── SPACER ── */}
            <Box sx={{ flex: 1 }} />

            {/* ── SELECTION PILL ── */}
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.6,
              px: 1.4, py: 0.35, borderRadius: '20px', flexShrink: 0,
              bgcolor: someSelected ? '#225038' : '#f1f5f9',
              color: someSelected ? 'white' : '#94a3b8',
              fontSize: 11.5, fontWeight: 700,
              border: '1px solid', borderColor: someSelected ? '#1a3d2b' : '#e2e8f0',
              transition: 'all 0.2s ease',
            }}>
              <Box component="span" sx={{
                width: 5.5, height: 5.5, borderRadius: '50%', display: 'inline-block',
                bgcolor: someSelected ? '#86efac' : '#cbd5e1',
                transition: 'all 0.2s ease',
              }} />
              {someSelected ? `${selectedIds.length} selected` : 'None selected'}
            </Box>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: '#e2e8f0' }} />

            {/* ── COLUMNS ── */}
            <Button size="small" onClick={e => setColAnchor(e.currentTarget)}
              sx={{
                borderRadius: '8px', fontSize: 12, fontWeight: 600, flexShrink: 0,
                color: '#475569', bgcolor: '#f1f5f9', border: '1px solid #e2e8f0',
                '&:hover': { bgcolor: '#e2e8f0' }, px: 1.4,
              }}>
              ⊞ Columns
            </Button>
            <Popover open={Boolean(colAnchor)} anchorEl={colAnchor} onClose={() => setColAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{ sx: { p: 1.5, borderRadius: '10px', minWidth: 180, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, mb: 1 }}>
                Toggle Columns
              </Typography>
              {[
                { key: 'template',  label: 'Template'  },
                { key: 'priority',  label: 'Priority'  },
                { key: 'status',    label: 'Status'    },
                { key: 'automated', label: 'Automated' },
                { key: 'section',   label: 'Section'   },
                { key: 'type',      label: 'Type'      },
              ].map(col => (
                <FormControlLabel key={col.key}
                  control={<Checkbox size="small" checked={!!visibleCols[col.key]} onChange={() => toggleCol(col.key)}
                    sx={{ '&.Mui-checked': { color: '#225038' }, py: 0.3 }} />}
                  label={<Typography sx={{ fontSize: 13 }}>{col.label}</Typography>}
                  sx={{ display: 'flex', m: 0 }}
                />
              ))}
            </Popover>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: '#e2e8f0' }} />

            {/* ── BULK EDIT ── */}
            <Tooltip title={someSelected ? `Bulk edit ${selectedIds.length} test cases` : 'Select rows to enable'} arrow>
              <span>
                <Button size="small" startIcon={<EditOutlinedIcon sx={{ fontSize: 14 }} />}
                  disabled={!someSelected} onClick={() => setBulkEditOpen(true)}
                  sx={{
                    borderRadius: '8px', fontSize: 12, fontWeight: 600, flexShrink: 0,
                    color: someSelected ? '#225038' : '#b0bec5',
                    bgcolor: someSelected ? 'rgba(34,80,56,0.08)' : 'transparent',
                    border: '1px solid', borderColor: someSelected ? '#86efac' : '#e2e8f0',
                    '&:hover': { bgcolor: '#dcfce7', borderColor: '#4ade80' },
                    '&.Mui-disabled': { color: '#b0bec5', borderColor: '#e9edf0', bgcolor: 'transparent' },
                    transition: 'all 0.15s',
                  }}>
                  Bulk Edit
                </Button>
              </span>
            </Tooltip>

            {/* ── MOVE ── */}
            <Tooltip title={someSelected ? `Move ${selectedIds.length} cases to another project` : 'Select rows to enable'} arrow>
              <span>
                <Button size="small" startIcon={<DriveFileMoveOutlinedIcon sx={{ fontSize: 14 }} />}
                  disabled={!someSelected} onClick={() => setBulkMoveOpen(true)}
                  sx={{
                    borderRadius: '8px', fontSize: 12, fontWeight: 600, flexShrink: 0,
                    color: someSelected ? '#2563eb' : '#b0bec5',
                    bgcolor: someSelected ? 'rgba(37,99,235,0.07)' : 'transparent',
                    border: '1px solid', borderColor: someSelected ? '#bfdbfe' : '#e2e8f0',
                    '&:hover': { bgcolor: '#dbeafe', borderColor: '#93c5fd' },
                    '&.Mui-disabled': { color: '#b0bec5', borderColor: '#e9edf0', bgcolor: 'transparent' },
                    transition: 'all 0.15s',
                  }}>
                  Move
                </Button>
              </span>
            </Tooltip>

            {/* ── DELETE ── */}
            <Tooltip title={someSelected ? `Permanently delete ${selectedIds.length} test cases` : 'Select rows to enable'} arrow>
              <span>
                <Button size="small" startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                  disabled={!someSelected} onClick={() => setConfirmDeleteOpen(true)}
                  sx={{
                    borderRadius: '8px', fontSize: 12, fontWeight: 600, flexShrink: 0,
                    color: someSelected ? '#dc2626' : '#b0bec5',
                    bgcolor: someSelected ? 'rgba(220,38,38,0.07)' : 'transparent',
                    border: '1px solid', borderColor: someSelected ? '#fca5a5' : '#e2e8f0',
                    '&:hover': { bgcolor: '#fee2e2', borderColor: '#f87171' },
                    '&.Mui-disabled': { color: '#b0bec5', borderColor: '#e9edf0', bgcolor: 'transparent' },
                    transition: 'all 0.15s',
                  }}>
                  Delete
                </Button>
              </span>
            </Tooltip>

            {someSelected && (
              <IconButton size="small" onClick={() => setSelectedIds([])}
                sx={{ color: '#94a3b8', '&:hover': { color: '#475569', bgcolor: '#f1f5f9' } }}>
                <ClearIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}

          </Box>
        </Paper>

        {/* ── TABLE ───────────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', overflow: 'hidden' }}>
          <TableContainer>
            <Table sx={{ tableLayout: 'fixed', minWidth: 700 }}>
              <colgroup>
                <col style={{ width: 52 }} />
                <col style={{ width: colWidths.id }} />
                <col style={{ width: colWidths.title }} />
                {visibleCols.section   && <col style={{ width: 120 }} />}
                {visibleCols.type      && <col style={{ width: 100 }} />}
                {visibleCols.template  && <col style={{ width: colWidths.template }} />}
                {visibleCols.priority  && <col style={{ width: colWidths.priority }} />}
                {visibleCols.status    && <col style={{ width: colWidths.status }} />}
                {visibleCols.automated && <col style={{ width: 110 }} />}
                <col style={{ width: Math.max(colWidths.actions, 150) }} />
              </colgroup>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {/* Checkbox col — no resize */}
                  <TableCell padding="checkbox" sx={{ pl: 2, bgcolor: '#f8fafc' }}>
                    <Tooltip title={allSelected ? 'Deselect all' : 'Select all'}>
                      <Checkbox size="small" checked={allSelected} indeterminate={someSelected && !allSelected} onChange={toggleAll}
                        sx={{ '&.Mui-checked': { color: '#225038' }, '&.MuiCheckbox-indeterminate': { color: '#225038' } }} />
                    </Tooltip>
                  </TableCell>

                  {/* Dynamic header cols */}
                  {[
                    { key: 'id',        label: 'ID',        align: 'left',  always: true  },
                    { key: 'title',     label: 'Title',     align: 'left',  always: true  },
                    { key: 'section',   label: 'Section',   align: 'left',  always: false },
                    { key: 'type',      label: 'Type',      align: 'left',  always: false },
                    { key: 'template',  label: 'Template',  align: 'left',  always: false },
                    { key: 'priority',  label: 'Priority',  align: 'left',  always: false },
                    { key: 'status',    label: 'Status',    align: 'left',  always: false },
                    { key: 'automated', label: 'Automated', align: 'left',  always: false },
                    { key: 'actions',   label: 'Actions',   align: 'right', always: true  },
                  ].filter(col => col.always || visibleCols[col.key]).map(col => (
                    <TableCell key={col.key} align={col.align}
                      sx={{
                        fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6,
                        color: '#64748b', bgcolor: '#f8fafc', userSelect: 'none',
                        position: 'relative', overflow: 'hidden', whiteSpace: 'nowrap',
                        px: col.key === 'actions' ? 2 : 1.5,
                        borderBottom: '2px solid #e2e8f0',
                      }}>
                      {col.label}
                      {/* Resize handle */}
                      {col.key !== 'actions' && (
                        <Box
                          onMouseDown={(e) => startResize(col.key, e)}
                          sx={{
                            position: 'absolute', right: 0, top: '20%', bottom: '20%',
                            width: 4, cursor: 'col-resize', borderRadius: 2,
                            bgcolor: 'transparent',
                            '&:hover': { bgcolor: '#225038' },
                            transition: 'background 0.15s',
                          }}
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3 + Object.values(visibleCols).filter(Boolean).length} align="center" sx={{ py: 8 }}>
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
                      <TableCell sx={{ py: 1.2, px: 1.5 }}>
                        <Box sx={{
                          display: 'inline-flex', alignItems: 'center',
                          px: 1, py: 0.3, borderRadius: '6px',
                          bgcolor: isSelected ? '#dcfce7' : '#f1f5f9',
                          border: '1px solid', borderColor: isSelected ? '#86efac' : '#e2e8f0',
                          transition: 'all 0.15s',
                        }}>
                          <Typography sx={{
                            fontSize: 11, fontWeight: 700,
                            color: isSelected ? '#225038' : '#64748b',
                            fontFamily: 'monospace', letterSpacing: 0.4,
                            whiteSpace: 'nowrap', lineHeight: 1.4,
                          }}>
                            TC-{tc.id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.2, px: 1.5, overflow: 'hidden' }}>
                        <Typography sx={{
                          fontSize: 13, fontWeight: 600, color: '#1e293b', cursor: 'pointer',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          '&:hover': { color: '#225038', textDecoration: 'underline' }
                        }}
                          onClick={() => openDrawer(tc)}>
                          {tc.title}
                        </Typography>
                        {tc.field_values?.section && (
                          <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tc.field_values.section}
                          </Typography>
                        )}
                      </TableCell>
                      {visibleCols.section && (
                        <TableCell sx={{ py: 1.2, px: 1.5, overflow: 'hidden' }}>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tc.field_values?.section || '—'}
                          </Typography>
                        </TableCell>
                      )}
                      {visibleCols.type && (
                        <TableCell sx={{ py: 1.2, px: 1.5, overflow: 'hidden' }}>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tc.field_values?.type || '—'}
                          </Typography>
                        </TableCell>
                      )}
                      {visibleCols.template && (
                        <TableCell sx={{ py: 1.2, px: 1.5, overflow: 'hidden' }}>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {templates.find(t => t.id === tc.template_id)?.name || '—'}
                          </Typography>
                        </TableCell>
                      )}
                      {visibleCols.priority && (
                        <TableCell sx={{ py: 1.2 }}>
                          {tc.priority ? (
                            <Chip label={tc.priority} size="small"
                              sx={{ bgcolor: pColor.bg, color: pColor.color, fontWeight: 700, fontSize: 11, height: 20, borderRadius: '5px' }} />
                          ) : <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>—</Typography>}
                        </TableCell>
                      )}
                      {visibleCols.status && (
                        <TableCell sx={{ py: 1.2 }}>
                          <Chip label={tc.status || 'Draft'} size="small"
                            sx={{
                              bgcolor: tc.status === 'Active' ? '#dcfce7' : tc.status === 'Deprecated' ? '#fee2e2' : '#f1f5f9',
                              color: tc.status === 'Active' ? '#15803d' : tc.status === 'Deprecated' ? '#dc2626' : '#64748b',
                              fontWeight: 600, fontSize: 11, height: 20, borderRadius: '5px'
                            }} />
                        </TableCell>
                      )}
                      {visibleCols.automated && (
                        <TableCell sx={{ py: 1.2 }}>
                          {(() => {
                            const isAuto = tc.field_values?.is_automated === true || tc.field_values?.is_automated === 'true';
                            return (
                              <Chip label={isAuto ? 'Automated' : 'Manual'} size="small"
                                sx={{
                                  bgcolor: isAuto ? '#f3e8ff' : '#f1f5f9',
                                  color: isAuto ? '#7c3aed' : '#64748b',
                                  fontWeight: 600, fontSize: 11, height: 20, borderRadius: '5px'
                                }} />
                            );
                          })()}
                        </TableCell>
                      )}
                      <TableCell align="right" sx={{ pr: 2, py: 1, whiteSpace: 'nowrap' }}>
                        {/* Automation toggle */}
                        {(() => {
                          const isAuto = tc.field_values?.is_automated === true || tc.field_values?.is_automated === 'true';
                          return (
                            <Tooltip title={isAuto ? 'Automated — click to mark as Manual' : 'Manual — click to mark as Automated'}>
                              <Button size="small" onClick={() => handleToggleAutomation(tc)}
                                sx={{
                                  minWidth: 32, width: 32, height: 28, p: 0, borderRadius: '7px', mr: 0.5,
                                  color: isAuto ? '#7c3aed' : '#94a3b8',
                                  bgcolor: isAuto ? '#f3e8ff' : 'transparent',
                                  border: '1px solid',
                                  borderColor: isAuto ? '#c4b5fd' : '#e2e8f0',
                                  '&:hover': { bgcolor: isAuto ? '#ede9fe' : '#f3e8ff', borderColor: '#c4b5fd', color: '#7c3aed' },
                                  transition: 'all 0.15s',
                                }}>
                                <SmartToyOutlinedIcon sx={{ fontSize: 14 }} />
                              </Button>
                            </Tooltip>
                          );
                        })()}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Rewrite fields in professional QA English using AI">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SmartToyOutlinedIcon />}
                  onClick={handleEnrich}
                  disabled={enriching}
                  sx={{ textTransform: 'none', borderColor: '#7c3aed', color: '#7c3aed',
                    '&:hover': { borderColor: '#6d28d9', bgcolor: 'rgba(124,58,237,0.06)' } }}
                >
                  {enriching ? 'Enriching…' : '✨ AI Enrich'}
                </Button>
              </span>
            </Tooltip>
            <IconButton size="small" onClick={handleCloseDialog}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {/* AI Enrichment Preview */}
          {enrichPreview && (
            <Alert
              severity="info"
              icon={<SmartToyOutlinedIcon />}
              sx={{ mb: 3, '& .MuiAlert-message': { width: '100%' } }}
              action={
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button size="small" variant="contained" color="primary" onClick={applyEnrichment}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                    Apply
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => setEnrichPreview(null)}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                    Discard
                  </Button>
                </Box>
              }
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                AI Enrichment Preview — review and click Apply to update the form
              </Typography>
              {enrichPreview.title && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Title:</Typography>
                  <Typography variant="body2">{enrichPreview.title}</Typography>
                </Box>
              )}
              {enrichPreview.preconditions && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Preconditions:</Typography>
                  <Typography variant="body2">{enrichPreview.preconditions}</Typography>
                </Box>
              )}
              {enrichPreview.description && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Description:</Typography>
                  <Typography variant="body2">{enrichPreview.description}</Typography>
                </Box>
              )}
              {enrichPreview.steps && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Steps:</Typography>
                  {(Array.isArray(enrichPreview.steps) ? enrichPreview.steps : [enrichPreview.steps]).map((s, i) => (
                    <Typography key={i} variant="body2">{i + 1}. {s}</Typography>
                  ))}
                </Box>
              )}
              {enrichPreview.expected_result && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Expected Result:</Typography>
                  <Typography variant="body2">{enrichPreview.expected_result}</Typography>
                </Box>
              )}
            </Alert>
          )}

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
                  <MenuItem value="P0"><Box sx={{ display:'flex', alignItems:'center', gap:1 }}><Box sx={{ width:8, height:8, borderRadius:'50%', bgcolor:'#dc2626' }} />P0 — Critical</Box></MenuItem>
                  <MenuItem value="P1"><Box sx={{ display:'flex', alignItems:'center', gap:1 }}><Box sx={{ width:8, height:8, borderRadius:'50%', bgcolor:'#ea580c' }} />P1 — High</Box></MenuItem>
                  <MenuItem value="P2"><Box sx={{ display:'flex', alignItems:'center', gap:1 }}><Box sx={{ width:8, height:8, borderRadius:'50%', bgcolor:'#ca8a04' }} />P2 — Medium</Box></MenuItem>
                  <MenuItem value="P3"><Box sx={{ display:'flex', alignItems:'center', gap:1 }}><Box sx={{ width:8, height:8, borderRadius:'50%', bgcolor:'#16a34a' }} />P3 — Low</Box></MenuItem>
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

      {/* ── DETAIL DRAWER ─────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={Boolean(drawerTc)}
        onClose={() => setDrawerTc(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 600 }, display: 'flex', flexDirection: 'column' } }}
      >
        {drawerTc && (
          <>
            {/* Drawer Header */}
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #1a3d2b 0%, #225038 100%)', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, mr: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <Box sx={{ px: 1, py: 0.3, borderRadius: '6px', bgcolor: 'rgba(255,255,255,0.15)' }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>
                        TC-{drawerTc.id}
                      </Typography>
                    </Box>
                    {drawerTc.priority && (
                      <Chip label={drawerTc.priority} size="small"
                        sx={{ height: 20, fontSize: 10, fontWeight: 700, borderRadius: '5px',
                          bgcolor: PRIORITY_COLORS[drawerTc.priority]?.bg || '#f1f5f9',
                          color: PRIORITY_COLORS[drawerTc.priority]?.color || '#64748b' }} />
                    )}
                  </Box>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'white', lineHeight: 1.35 }}>
                    {drawerTc.title}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => { setDrawerTc(null); handleOpenDialog(drawerTc); }}
                      sx={{ color: 'rgba(255,255,255,0.75)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => setDrawerTc(null)}
                    sx={{ color: 'rgba(255,255,255,0.75)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Box>
            </Box>

            {/* Tabs */}
            <Tabs value={drawerTab} onChange={(_, v) => setDrawerTab(v)} variant="scrollable" scrollButtons="auto"
              sx={{ px: 2, borderBottom: '1px solid #e2e8f0', minHeight: 44, flexShrink: 0,
                '& .MuiTab-root': { minHeight: 44, fontSize: 12, fontWeight: 600, textTransform: 'none', color: '#64748b', px: 1.5 },
                '& .Mui-selected': { color: '#225038' },
                '& .MuiTabs-indicator': { bgcolor: '#225038' } }}>
              <Tab label="Details" />
              <Tab label="Comments" />
              <Tab label="Attachments" />
              <Tab label="History" />
              <Tab label="Defects" />
            </Tabs>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>

              {/* DETAILS TAB */}
              {drawerTab === 0 && (
                <Box>
                  {drawerTc.description && (
                    <Box sx={{ mb: 2.5 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>Description</Typography>
                      <Typography sx={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{drawerTc.description}</Typography>
                    </Box>
                  )}
                  {drawerTc.steps && drawerTc.steps.length > 0 && (
                    <Box sx={{ mb: 2.5 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>Steps</Typography>
                      {(Array.isArray(drawerTc.steps) ? drawerTc.steps : [drawerTc.steps]).map((step, i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 1.25, mb: 0.75 }}>
                          <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#64748b' }}>{i + 1}</Typography>
                          </Box>
                          <Typography sx={{ fontSize: 13, color: '#374151', lineHeight: 1.6, pt: 0.2 }}>{step}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  {drawerTc.expected_result && (
                    <Box sx={{ mb: 2.5 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>Expected Result</Typography>
                      <Box sx={{ bgcolor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', p: 1.5 }}>
                        <Typography sx={{ fontSize: 13, color: '#15803d', lineHeight: 1.7 }}>{drawerTc.expected_result}</Typography>
                      </Box>
                    </Box>
                  )}
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    {[
                      { label: 'Status', value: drawerTc.status || 'Draft' },
                      { label: 'Priority', value: drawerTc.priority || '—' },
                      { label: 'Type', value: drawerTc.field_values?.type || '—' },
                      { label: 'Section', value: drawerTc.field_values?.section || '—' },
                      { label: 'Assigned To', value: drawerTc.field_values?.assigned_to || 'Unassigned' },
                      { label: 'Estimate', value: drawerTc.field_values?.estimate || '—' },
                      { label: 'Automation', value: drawerTc.field_values?.automation_type || 'None' },
                      { label: 'Is Automated', value: (drawerTc.field_values?.is_automated === true || drawerTc.field_values?.is_automated === 'true') ? 'Yes' : 'No' },
                    ].map(item => (
                      <Grid item xs={6} key={item.label}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.3 }}>{item.label}</Typography>
                        <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{item.value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                  {drawerTc.field_values?.preconditions && (
                    <Box sx={{ mt: 2.5 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>Preconditions</Typography>
                      <Typography sx={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{drawerTc.field_values.preconditions}</Typography>
                    </Box>
                  )}
                  {drawerTc.field_values?.references && (
                    <Box sx={{ mt: 2 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>References</Typography>
                      <Typography sx={{ fontSize: 13, color: '#2563eb', lineHeight: 1.6 }}>{drawerTc.field_values.references}</Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* COMMENTS TAB */}
              {drawerTab === 1 && (
                <CommentThread entityType="test_case" entityId={drawerTc.id} />
              )}

              {/* ATTACHMENTS TAB */}
              {drawerTab === 2 && (
                <AttachmentPanel entityType="test_case" entityId={drawerTc.id} />
              )}

              {/* HISTORY TAB */}
              {drawerTab === 3 && (
                <VersionHistory testCaseId={drawerTc.id} onRestore={() => { loadTestCases(); }} />
              )}

              {/* DEFECTS TAB */}
              {drawerTab === 4 && (
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: '#64748b', mb: 2 }}>
                    Linked Defects ({drawerDefects.length})
                  </Typography>
                  {drawerDefectsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={24} sx={{ color: '#225038' }} />
                    </Box>
                  ) : drawerDefects.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                      <BugReportOutlinedIcon sx={{ fontSize: 32, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No defects linked to this test case.</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {drawerDefects.map(defect => {
                        const sevColors = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#3b82f6' };
                        const sevBgs = { critical: '#fee2e2', high: '#ffedd5', medium: '#fef9c3', low: '#dbeafe' };
                        const stColors = { open: '#dc2626', in_progress: '#2563eb', resolved: '#16a34a', closed: '#64748b' };
                        const stBgs = { open: '#fee2e2', in_progress: '#dbeafe', resolved: '#dcfce7', closed: '#f1f5f9' };
                        return (
                          <Box key={defect.id} sx={{ p: 2, borderRadius: '10px', border: '1px solid #e2e8f0', bgcolor: 'white', '&:hover': { borderColor: '#cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }, transition: 'all 0.15s' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', fontFamily: 'monospace' }}>DEF-{defect.id}</Typography>
                                <Chip label={defect.severity} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, borderRadius: '5px', bgcolor: sevBgs[defect.severity] || '#f1f5f9', color: sevColors[defect.severity] || '#64748b', textTransform: 'capitalize' }} />
                                <Chip label={defect.status?.replace('_', ' ')} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, borderRadius: '5px', bgcolor: stBgs[defect.status] || '#f1f5f9', color: stColors[defect.status] || '#64748b', textTransform: 'capitalize' }} />
                              </Box>
                              {defect.github_issue_url && (
                                <Tooltip title="View GitHub Issue">
                                  <IconButton size="small" component="a" href={defect.github_issue_url} target="_blank" rel="noopener"
                                    sx={{ color: '#24292f', '&:hover': { bgcolor: '#f1f5f9' } }}>
                                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{defect.title}</Typography>
                            {defect.assignee_name && (
                              <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>Assigned to {defect.assignee_name}</Typography>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </>
        )}
      </Drawer>
    </Box>
  );
}
