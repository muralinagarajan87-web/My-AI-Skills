import React, { useState, useEffect } from 'react';
import {
  Container, Paper, TextField, Button, Box, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, FormLabel, Select, MenuItem, Checkbox, FormControlLabel,
  FormGroup, RadioGroup, Radio, Grid, InputLabel, IconButton, Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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

  const selectedTemplate = getSelectedTemplate();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">Test Cases</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Project:</Typography>
            <TextField
              select
              value={currentWorkspaceId || ''}
              onChange={(e) => handleSwitchWorkspace(Number(e.target.value))}
              size="small"
              sx={{ minWidth: 220 }}
            >
              {workspaces.map((ws) => (
                <MenuItem key={ws.id} value={ws.id}>{ws.name}</MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setUploadOpen(true)}>
            Import
          </Button>
          <Button variant="contained" onClick={() => handleOpenDialog()}>
            + Create Test Case
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell><strong>Title</strong></TableCell>
              <TableCell><strong>Template</strong></TableCell>
              <TableCell><strong>Priority</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {testCases.map(tc => (
              <TableRow key={tc.id}>
                <TableCell>{tc.title}</TableCell>
                <TableCell>{templates.find(t => t.id === tc.template_id)?.name || '-'}</TableCell>
                <TableCell>{tc.priority}</TableCell>
                <TableCell>{tc.status}</TableCell>
                <TableCell align="center">
                  <Button size="small" onClick={() => handleOpenDialog(tc)}>Edit</Button>
                  <Button size="small" onClick={() => handleViewResults(tc)}>Results</Button>
                  <Button size="small" onClick={() => handleClone(tc)}>Clone</Button>
                  <Button size="small" color="error" onClick={() => handleDelete(tc.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
    </Container>
  );
}
