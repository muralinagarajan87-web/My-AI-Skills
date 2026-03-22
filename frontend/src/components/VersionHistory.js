import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Chip, Button, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, CircularProgress, Divider
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import RestoreIcon from '@mui/icons-material/Restore';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { testCaseAPI } from '../services/api';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

function VersionDetail({ version }) {
  if (!version) return null;
  const data = version.snapshot || version;
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Priority</Typography>
          <Typography sx={{ fontSize: 13 }}>{data.priority || '—'}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Status</Typography>
          <Typography sx={{ fontSize: 13 }}>{data.status || '—'}</Typography>
        </Box>
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Title</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{data.title || '—'}</Typography>
      </Box>
      {data.description && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Description</Typography>
          <Typography sx={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{data.description}</Typography>
        </Box>
      )}
      {data.steps && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Steps</Typography>
          {Array.isArray(data.steps)
            ? data.steps.map((step, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>{i + 1}</Typography>
                </Box>
                <Typography sx={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{step}</Typography>
              </Box>
            ))
            : <Typography sx={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap' }}>{data.steps}</Typography>
          }
        </Box>
      )}
      {data.expected_result && (
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Expected Result</Typography>
          <Typography sx={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{data.expected_result}</Typography>
        </Box>
      )}
    </Box>
  );
}

export default function VersionHistory({ testCaseId, onRestore }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewVersion, setViewVersion] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (testCaseId) load();
  }, [testCaseId]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await testCaseAPI.getVersions(testCaseId);
      setVersions(r.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      await testCaseAPI.restoreVersion(testCaseId, restoreTarget.id);
      setRestoreTarget(null);
      load();
      if (onRestore) onRestore();
    } catch (e) {
      console.error(e);
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} sx={{ color: '#225038' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: '#64748b', mb: 2 }}>
        Version History ({versions.length})
      </Typography>

      {versions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
          <HistoryIcon sx={{ fontSize: 32, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No version history available yet.</Typography>
        </Box>
      ) : (
        <Box sx={{ position: 'relative' }}>
          {/* Timeline line */}
          <Box sx={{ position: 'absolute', left: 15, top: 20, bottom: 20, width: 2, bgcolor: '#e2e8f0', zIndex: 0 }} />

          {versions.map((version, idx) => {
            const isCurrent = idx === 0;
            return (
              <Box key={version.id} sx={{ position: 'relative', pl: 4.5, mb: 2 }}>
                {/* Timeline dot */}
                <Box sx={{
                  position: 'absolute', left: 8, top: 14,
                  width: 16, height: 16, borderRadius: '50%', zIndex: 1,
                  bgcolor: isCurrent ? '#4ade80' : '#e2e8f0',
                  border: `3px solid ${isCurrent ? '#225038' : '#94a3b8'}`,
                  boxShadow: isCurrent ? '0 0 0 3px rgba(74,222,128,0.2)' : 'none',
                }} />

                <Card elevation={0} sx={{
                  border: `1px solid ${isCurrent ? '#86efac' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  bgcolor: isCurrent ? '#f0fdf4' : 'white',
                }}>
                  <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                            Version #{version.version_number || (versions.length - idx)}
                          </Typography>
                          {isCurrent && (
                            <Chip label="Current" size="small"
                              sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: '#225038', color: 'white', borderRadius: '5px' }} />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                          {timeAgo(version.created_at)} · by {version.changed_by || version.author_name || 'System'}
                        </Typography>
                        {version.change_reason && (
                          <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.5, fontStyle: 'italic' }}>
                            "{version.change_reason}"
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
                        <Button size="small" startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 13 }} />}
                          onClick={() => setViewVersion(version)}
                          sx={{ fontSize: 11, fontWeight: 600, borderRadius: '7px', color: '#2563eb', border: '1px solid #bfdbfe',
                            bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' }, px: 1.25 }}>
                          View
                        </Button>
                        {!isCurrent && (
                          <Button size="small" startIcon={<RestoreIcon sx={{ fontSize: 13 }} />}
                            onClick={() => setRestoreTarget(version)}
                            sx={{ fontSize: 11, fontWeight: 600, borderRadius: '7px', color: '#d97706', border: '1px solid #fde68a',
                              bgcolor: '#fffbeb', '&:hover': { bgcolor: '#fef3c7' }, px: 1.25 }}>
                            Restore
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>
      )}

      {/* View Version Dialog */}
      <Dialog open={Boolean(viewVersion)} onClose={() => setViewVersion(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', pb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Version #{viewVersion?.version_number || '?'} Snapshot
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
              {viewVersion?.created_at ? new Date(viewVersion.created_at).toLocaleString() : ''} · {viewVersion?.changed_by || 'System'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setViewVersion(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <VersionDetail version={viewVersion} />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2 }}>
          <Button onClick={() => setViewVersion(null)} variant="outlined" sx={{ borderRadius: '10px' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={Boolean(restoreTarget)} onClose={() => setRestoreTarget(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography fontWeight={700}>Restore Version #{restoreTarget?.version_number || '?'}?</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            This will overwrite the current version with the snapshot from{' '}
            <strong>{restoreTarget?.created_at ? new Date(restoreTarget.created_at).toLocaleDateString() : 'this version'}</strong>.
            A new version entry will be created so the current state is preserved.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setRestoreTarget(null)} sx={{ borderRadius: '10px' }}>Cancel</Button>
          <Button onClick={handleRestore} variant="contained" disabled={restoring}
            sx={{ bgcolor: '#d97706', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#b45309' } }}>
            {restoring ? 'Restoring...' : 'Yes, Restore'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
