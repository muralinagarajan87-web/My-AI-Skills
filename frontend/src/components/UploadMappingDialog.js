import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, MenuItem, Select, FormControl, Chip, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, Paper,
  IconButton, CircularProgress, Alert, Stepper, Step, StepLabel
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TableViewIcon from '@mui/icons-material/TableView';
import { uploadAPI } from '../services/api';

// All mappable test case fields
const TARGET_FIELDS = [
  { key: 'title',       label: 'Title',           required: true,  hint: 'The test case name' },
  { key: 'description', label: 'Description',      required: false, hint: 'Summary or overview' },
  { key: 'steps',       label: 'Steps',            required: false, hint: 'Test steps (newline separated)' },
  { key: 'expected_result', label: 'Expected Result', required: false, hint: 'What should happen' },
  { key: 'priority',    label: 'Priority',         required: false, hint: 'Critical / High / Medium / Low' },
  { key: 'status',      label: 'Status',           required: false, hint: 'Draft / Active / Deprecated' },
  { key: 'section',     label: 'Section',          required: false, hint: 'Feature area or module' },
  { key: 'type',        label: 'Type',             required: false, hint: 'Functional / Regression / etc.' },
  { key: 'preconditions', label: 'Preconditions',  required: false, hint: 'Pre-setup requirements' },
  { key: 'references',  label: 'References',       required: false, hint: 'JIRA / ticket IDs' },
];

export default function UploadMappingDialog({ open, onClose, onSuccess, templateId }) {
  const [step, setStep] = useState(0); // 0: upload, 1: map, 2: done
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // { tempId, tempExt, headers, sample, totalRows }
  const [mapping, setMapping] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [fileName, setFileName] = useState('');

  // Auto-guess mapping when headers arrive
  useEffect(() => {
    if (!preview?.headers) return;
    const guessMap = {};
    const headerLower = preview.headers.map(h => h.toLowerCase());
    TARGET_FIELDS.forEach(field => {
      const aliases = {
        title: ['title', 'name', 'test name', 'test case', 'test case name', 'case name', 'summary'],
        description: ['description', 'desc', 'overview', 'detail'],
        steps: ['steps', 'step', 'test steps', 'steps to reproduce', 'actions'],
        expected_result: ['expected result', 'expected', 'expected results', 'result', 'expected output'],
        priority: ['priority', 'severity', 'prio', 'p0', 'p1'],
        status: ['status', 'state'],
        section: ['section', 'module', 'feature', 'area', 'folder', 'suite'],
        type: ['type', 'test type', 'category'],
        preconditions: ['preconditions', 'precondition', 'pre-condition', 'setup', 'prerequisite'],
        references: ['references', 'reference', 'jira', 'ticket', 'issue', 'link'],
      };
      const candidates = aliases[field.key] || [field.key];
      const idx = headerLower.findIndex(h => candidates.some(c => h === c || h.includes(c)));
      if (idx !== -1) guessMap[field.key] = preview.headers[idx];
    });
    setMapping(guessMap);
  }, [preview]);

  const handleReset = () => {
    setStep(0); setPreview(null); setMapping({});
    setImportResult(null); setError(''); setFileName('');
  };

  const handleClose = () => { handleReset(); onClose(); };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setLoading(true);
    try {
      const res = await uploadAPI.previewFile(file);
      setPreview(res.data);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to read file. Check the format.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleImport = async () => {
    if (!mapping.title) { setError('Please map the Title field — it is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await uploadAPI.importWithMapping(preview.tempId, preview.tempExt, mapping, templateId);
      setImportResult(res.data);
      setStep(2);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mappedCount = TARGET_FIELDS.filter(f => mapping[f.key]).length;
  const previewRows = preview?.sample?.slice(0, 3) || [];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', minHeight: step === 1 ? '80vh' : 'auto' } }}>

      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Import Test Cases</Typography>
          {fileName && <Typography variant="caption" color="text.disabled">{fileName}</Typography>}
        </Box>
        <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>

        {/* ── STEP 0: Drop zone ── */}
        {step === 0 && (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                <CircularProgress size={40} sx={{ color: '#225038' }} />
                <Typography color="text.secondary">Reading file columns...</Typography>
              </Box>
            ) : (
              <>
                <Box sx={{
                  border: '2px dashed', borderColor: '#c8d8ce', borderRadius: '14px',
                  p: 5, mb: 3, bgcolor: '#f0fdf4',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#225038', bgcolor: '#dcfce7' }
                }}>
                  <TableViewIcon sx={{ fontSize: 52, color: '#86efac', mb: 1.5 }} />
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                    Select your Excel or CSV file
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    The first row must contain column headers. Supports .xlsx, .xls, .csv
                  </Typography>
                  <input type="file" accept=".csv,.xlsx,.xls" id="mapping-file-input"
                    style={{ display: 'none' }} onChange={handleFileSelect} />
                  <label htmlFor="mapping-file-input">
                    <Button variant="contained" component="span"
                      sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 600, px: 3,
                        '&:hover': { bgcolor: '#1a3d2b' } }}>
                      Browse File
                    </Button>
                  </label>
                </Box>

                <Box sx={{ bgcolor: '#f8fafc', borderRadius: '12px', p: 2.5, textAlign: 'left' }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Expected column headers (examples)</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {['Title', 'Description', 'Steps', 'Expected Result', 'Priority', 'Status', 'Section', 'Type', 'Preconditions', 'References'].map(h => (
                      <Chip key={h} label={h} size="small" sx={{ bgcolor: 'white', border: '1px solid #e2e8f0', fontSize: 12 }} />
                    ))}
                  </Box>
                </Box>
              </>
            )}
            {error && <Alert severity="error" sx={{ mt: 2, borderRadius: '10px' }}>{error}</Alert>}
          </Box>
        )}

        {/* ── STEP 1: Column Mapping ── */}
        {step === 1 && preview && (
          <Box>
            {/* File summary banner */}
            <Box sx={{ px: 3, py: 2, bgcolor: '#f0fdf4', borderBottom: '1px solid', borderColor: '#bbf7d0',
              display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 18 }} />
              <Typography variant="body2" fontWeight={600} sx={{ color: '#15803d' }}>
                File parsed successfully
              </Typography>
              <Chip label={`${preview.totalRows} rows`} size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11 }} />
              <Chip label={`${preview.headers.length} columns detected`} size="small" sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 700, fontSize: 11 }} />
              <Chip label={`${mappedCount} fields mapped`} size="small" sx={{ bgcolor: '#f3e8ff', color: '#7c3aed', fontWeight: 700, fontSize: 11 }} />
            </Box>

            <Box sx={{ display: 'flex', height: 'calc(80vh - 160px)', minHeight: 400, overflow: 'hidden' }}>

              {/* Left: Mapping table */}
              <Box sx={{ flex: '0 0 55%', overflowY: 'auto', borderRight: '1px solid', borderColor: 'divider', p: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                  Map columns to test case fields
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2.5 }}>
                  We've auto-detected common column names. Adjust as needed.
                </Typography>

                {TARGET_FIELDS.map(field => (
                  <Box key={field.key} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: '0 0 148px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>{field.label}</Typography>
                        {field.required && <Typography sx={{ color: '#dc2626', fontSize: 13, lineHeight: 1 }}>*</Typography>}
                      </Box>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{field.hint}</Typography>
                    </Box>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <Select
                        value={mapping[field.key] || ''}
                        onChange={e => setMapping(p => ({ ...p, [field.key]: e.target.value }))}
                        displayEmpty
                        sx={{ fontSize: 13, borderRadius: '8px',
                          bgcolor: mapping[field.key] ? '#f0fdf4' : 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: mapping[field.key] ? '#86efac' : '#e2e8f0'
                          }
                        }}
                      >
                        <MenuItem value="" sx={{ fontSize: 13, color: 'text.disabled' }}>
                          — Skip this field —
                        </MenuItem>
                        {preview.headers.map(h => (
                          <MenuItem key={h} value={h} sx={{ fontSize: 13 }}>{h}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {mapping[field.key] && (
                      <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 16, flexShrink: 0 }} />
                    )}
                  </Box>
                ))}
              </Box>

              {/* Right: Preview */}
              <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                  Data preview
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2 }}>
                  First {previewRows.length} rows from your file
                </Typography>

                {previewRows.length === 0 ? (
                  <Typography variant="body2" color="text.disabled">No data rows found.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {previewRows.map((row, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden' }}>
                        <Box sx={{ px: 2, py: 1, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Row {idx + 1}
                          </Typography>
                        </Box>
                        <Box sx={{ p: 1.5 }}>
                          {TARGET_FIELDS.filter(f => mapping[f.key]).map(field => {
                            const val = String(row[mapping[field.key]] ?? '').trim();
                            if (!val) return null;
                            return (
                              <Box key={field.key} sx={{ display: 'flex', gap: 1, mb: 0.75, alignItems: 'flex-start' }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#225038', minWidth: 90, flexShrink: 0, pt: 0.1 }}>
                                  {field.label}
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: 'text.primary', wordBreak: 'break-word' }}
                                  noWrap={val.length < 80}>
                                  {val.length > 100 ? val.slice(0, 100) + '…' : val}
                                </Typography>
                              </Box>
                            );
                          })}
                          {TARGET_FIELDS.filter(f => mapping[f.key]).every(f => !String(row[mapping[f.key]] ?? '').trim()) && (
                            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>No mapped data visible in this row.</Typography>
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>

            {error && (
              <Box sx={{ px: 3, pb: 1 }}>
                <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>
              </Box>
            )}
          </Box>
        )}

        {/* ── STEP 2: Done ── */}
        {step === 2 && importResult && (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#dcfce7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: '#16a34a' }} />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Import Complete!</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Successfully imported{' '}
              <Typography component="span" fontWeight={700} sx={{ color: '#16a34a' }}>
                {importResult.imported} test cases
              </Typography>{' '}
              into your workspace.
            </Typography>
            <Button variant="contained"
              sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 600, px: 3, '&:hover': { bgcolor: '#1a3d2b' } }}
              onClick={handleClose}>
              Done
            </Button>
          </Box>
        )}
      </DialogContent>

      {/* Footer actions */}
      {step === 1 && (
        <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', px: 3, py: 2, gap: 1.5 }}>
          <Button onClick={handleReset} variant="outlined" sx={{ borderRadius: '10px' }}>
            ← Choose Different File
          </Button>
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {preview?.totalRows} rows · {mappedCount} fields mapped
          </Typography>
          <Button onClick={handleImport} variant="contained" disabled={loading || !mapping.title}
            sx={{ bgcolor: '#225038', borderRadius: '10px', fontWeight: 700, px: 3, '&:hover': { bgcolor: '#1a3d2b' } }}>
            {loading
              ? <><CircularProgress size={16} sx={{ color: 'white', mr: 1 }} /> Importing...</>
              : `Import ${preview?.totalRows} Test Cases`}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
