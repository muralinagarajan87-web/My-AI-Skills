import React, { useState, useEffect } from 'react';
import {
  Container, Paper, TextField, Button, Box, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, IconButton,
  FormControlLabel, Checkbox, Radio
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { templateAPI } from '../services/api';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [fields, setFields] = useState([]);
  const [previewValues, setPreviewValues] = useState({});

  React.useEffect(() => {
    const defaults = {};
    fields.forEach((field) => {
      if (!field.name) return;
      defaults[field.name] = field.default ?? (field.type === 'checkbox' ? false : '');
    });
    setPreviewValues(defaults);
  }, [fields]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await templateAPI.getAll();
      setTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setEditingId(template.id);
      setFormData({
        name: template.name,
        description: template.description || ''
      });
      setFields(Array.isArray(template.fields) ? template.fields : []);
    } else {
      setEditingId(null);
      setFormData({ name: '', description: '' });
      setFields([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setFields([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addField = () => {
    setFields(prev => ([
      ...prev,
      {
        name: '',
        label: '',
        type: 'text',
        options: [],
        default: '',
        required: false,
        condition: { field: '', value: '' }
      }
    ]));
  };

  const removeField = (idx) => {
    setFields(prev => prev.filter((_, i) => i !== idx));
  };

  const moveField = (idx, direction) => {
    setFields(prev => {
      const next = [...prev];
      const target = idx + direction;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[target];
      next[target] = next[idx];
      next[idx] = temp;
      return next;
    });
  };

  const updateField = (idx, key, value) => {
    setFields(prev => prev.map((field, i) => (i === idx ? { ...field, [key]: value } : field)));
  };

  const parseOptions = (value) => {
    if (!value) return [];
    return value
      .split(/\r?\n|,/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  const optionsToString = (options) => {
    if (!Array.isArray(options)) return '';
    return options.join('\n');
  };

  const shouldShowField = (field, values) => {
    if (!field.condition || !field.condition.field) return true;
    const actual = values[field.condition.field];
    return String(actual) === String(field.condition.value);
  };

  const handlePreviewChange = (name, value) => {
    setPreviewValues(prev => ({ ...prev, [name]: value }));
  };

  const renderPreviewField = (field) => {
    if (!shouldShowField(field, previewValues)) return null;

    const value = previewValues[field.name] ?? field.default ?? '';
    const label = field.label || field.name;

    switch (field.type) {
      case 'textarea':
        return (
          <TextField
            fullWidth
            label={label}
            multiline
            rows={3}
            value={value}
            onChange={(e) => handlePreviewChange(field.name, e.target.value)}
            sx={{ mb: 2 }}
          />
        );
      case 'select':
        return (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{label}</InputLabel>
            <Select
              value={value}
              label={label}
              onChange={(e) => handlePreviewChange(field.name, e.target.value)}
            >
              <MenuItem value="">(None)</MenuItem>
              {Array.isArray(field.options) && field.options.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'radio':
        return (
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
            {Array.isArray(field.options) && field.options.map((opt) => (
              <FormControlLabel
                key={opt}
                value={opt}
                control={<Radio checked={value === opt} onChange={() => handlePreviewChange(field.name, opt)} />}
                label={opt}
              />
            ))}
          </FormControl>
        );
      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(value)}
                onChange={(e) => handlePreviewChange(field.name, e.target.checked)}
              />
            }
            label={label}
            sx={{ mb: 2 }}
          />
        );
      case 'checkboxGroup':
        return (
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
            {Array.isArray(field.options) && field.options.map((opt) => {
              const checked = Array.isArray(value) ? value.includes(opt) : false;
              return (
                <FormControlLabel
                  key={opt}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={(e) => {
                        const next = Array.isArray(value) ? [...value] : [];
                        if (e.target.checked) next.push(opt);
                        else {
                          const idx = next.indexOf(opt);
                          if (idx !== -1) next.splice(idx, 1);
                        }
                        handlePreviewChange(field.name, next);
                      }}
                    />
                  }
                  label={opt}
                />
              );
            })}
          </FormControl>
        );
      case 'button':
        return (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Array.isArray(field.options) && field.options.map((opt) => (
                <Button
                  key={opt}
                  variant={value === opt ? 'contained' : 'outlined'}
                  onClick={() => handlePreviewChange(field.name, opt)}
                >
                  {opt}
                </Button>
              ))}
            </Box>
          </Box>
        );
      case 'number':
        return (
          <TextField
            fullWidth
            label={label}
            type="number"
            value={value}
            onChange={(e) => handlePreviewChange(field.name, e.target.value)}
            sx={{ mb: 2 }}
          />
        );
      case 'date':
        return (
          <TextField
            fullWidth
            label={label}
            type="date"
            value={value}
            onChange={(e) => handlePreviewChange(field.name, e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
        );
      default:
        return (
          <TextField
            fullWidth
            label={label}
            value={value}
            onChange={(e) => handlePreviewChange(field.name, e.target.value)}
            sx={{ mb: 2 }}
          />
        );
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        description: formData.description,
        fields: fields || []
      };

      if (editingId) {
        await templateAPI.update(editingId, payload);
      } else {
        await templateAPI.create(payload);
      }

      handleCloseDialog();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this template?')) {
      try {
        await templateAPI.delete(id);
        loadTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Templates</Typography>
        <Button variant="contained" onClick={() => handleOpenDialog()}>
          + Create Template
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map(t => (
              <TableRow key={t.id}>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.description}</TableCell>
                <TableCell align="center">
                  <Button size="small" onClick={() => handleOpenDialog(t)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => handleDelete(t.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? 'Edit Template' : 'Create Template'}</DialogTitle>
        <DialogContent sx={{ mt: 2, overflowX: 'hidden' }}>
          <TextField
            fullWidth
            label="Template Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={3}
          />
          <Box sx={{ mt: 3, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1">Fields</Typography>
            <Button startIcon={<AddIcon />} onClick={addField} size="small">
              Add field
            </Button>
          </Box>

          {fields.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Add fields to define the inputs that appear when creating test cases (text, dropdown, checkbox, etc.).
            </Typography>
          )}

          {fields.map((field, idx) => (
            <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <TextField
                  label="Field Name"
                  value={field.name}
                  onChange={(e) => updateField(idx, 'name', e.target.value)}
                  size="small"
                  sx={{ flex: 1, minWidth: 160 }}
                  helperText="Used as the storage key (no spaces)."
                />
                <TextField
                  label="Label"
                  value={field.label}
                  onChange={(e) => updateField(idx, 'label', e.target.value)}
                  size="small"
                  sx={{ flex: 1, minWidth: 160 }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={field.type}
                    label="Type"
                    onChange={(e) => updateField(idx, 'type', e.target.value)}
                  >
                    <MenuItem value="text">Text</MenuItem>
                    <MenuItem value="textarea">Textarea</MenuItem>
                    <MenuItem value="select">Select</MenuItem>
                    <MenuItem value="radio">Radio</MenuItem>
                    <MenuItem value="checkbox">Checkbox</MenuItem>
                    <MenuItem value="checkboxGroup">Checkbox group</MenuItem>
                    <MenuItem value="button">Button group</MenuItem>
                    <MenuItem value="number">Number</MenuItem>
                    <MenuItem value="date">Date</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <IconButton size="small" onClick={() => moveField(idx, -1)} disabled={idx === 0}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}>
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </Box>

                <IconButton size="small" onClick={() => removeField(idx)} aria-label="Remove field">
                  <DeleteIcon />
                </IconButton>
              </Box>

              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {(field.type === 'select' || field.type === 'radio' || field.type === 'checkboxGroup' || field.type === 'button') && (
                  <TextField
                    fullWidth
                    label="Options (one per line)"
                    multiline
                    rows={3}
                    value={optionsToString(field.options)}
                    onChange={(e) => updateField(idx, 'options', parseOptions(e.target.value))}
                    size="small"
                    helperText="Used for dropdowns, radio buttons, and checkbox groups."
                  />
                )}

                {field.type === 'checkbox' ? (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(field.default)}
                        onChange={(e) => updateField(idx, 'default', e.target.checked)}
                      />
                    }
                    label="Default checked"
                  />
                ) : (
                  <TextField
                    fullWidth
                    label="Default value"
                    value={field.default || ''}
                    onChange={(e) => updateField(idx, 'default', e.target.value)}
                    size="small"
                    helperText="Optional default value for this field."
                  />
                )}

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(field.required)}
                      onChange={(e) => updateField(idx, 'required', e.target.checked)}
                    />
                  }
                  label="Required"
                  sx={{ ml: 0 }}
                />

                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Condition</InputLabel>
                  <Select
                    value={field.condition?.field || ''}
                    label="Condition"
                    onChange={(e) => updateField(idx, 'condition', { ...field.condition, field: e.target.value })}
                  >
                    <MenuItem value="">(Always show)</MenuItem>
                    {fields
                      .filter((_, i) => i !== idx && fields[i].name)
                      .map((other) => (
                        <MenuItem key={other.name} value={other.name}>{other.label || other.name}</MenuItem>
                      ))}
                  </Select>
                </FormControl>

                {field.condition?.field && (
                  <TextField
                    fullWidth
                    label="Condition value"
                    value={field.condition.value ?? ''}
                    onChange={(e) => updateField(idx, 'condition', { ...field.condition, value: e.target.value })}
                    size="small"
                  />
                )}
              </Box>
            </Paper>
          ))}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Preview (test case form)</Typography>
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.paper' }}>
              {fields.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Add fields to see a preview.
                </Typography>
              ) : (
                fields.map((field) => (
                  <Box key={field.name || Math.random()}>
                    {renderPreviewField(field)}
                  </Box>
                ))
              )}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
