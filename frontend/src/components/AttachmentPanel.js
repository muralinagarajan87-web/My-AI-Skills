import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, IconButton, Button, Card, CardContent,
  LinearProgress, Chip, Tooltip, CircularProgress
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import VideoFileOutlinedIcon from '@mui/icons-material/VideoFileOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import { attachmentAPI } from '../services/api';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getFileIcon(filename, mimetype) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const mime = mimetype || '';
  if (mime.startsWith('image/') || ['png','jpg','jpeg','gif','webp','svg'].includes(ext)) {
    return { icon: <ImageOutlinedIcon />, color: '#2563eb', bg: '#dbeafe' };
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return { icon: <PictureAsPdfOutlinedIcon />, color: '#dc2626', bg: '#fee2e2' };
  }
  if (mime.startsWith('video/') || ['mp4','mov','avi','mkv','webm'].includes(ext)) {
    return { icon: <VideoFileOutlinedIcon />, color: '#7c3aed', bg: '#f3e8ff' };
  }
  return { icon: <InsertDriveFileOutlinedIcon />, color: '#64748b', bg: '#f1f5f9' };
}

const ALLOWED_TYPES = [
  'image/png','image/jpeg','image/gif','image/webp','image/svg+xml',
  'application/pdf',
  'video/mp4','video/quicktime','video/webm',
  'text/plain','text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export default function AttachmentPanel({ entityType, entityId }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    if (entityId) load();
  }, [entityType, entityId]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await attachmentAPI.getAll(entityType, entityId);
      setAttachments(r.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file) => {
    setError('');
    if (file.size > MAX_SIZE) {
      setError(`File too large. Maximum size is 50MB.`);
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      // Simulate progress for UX
      const interval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 15, 85));
      }, 200);
      await attachmentAPI.upload(file, entityType, entityId);
      clearInterval(interval);
      setUploadProgress(100);
      await load();
      setTimeout(() => { setUploadProgress(0); setUploading(false); }, 600);
    } catch (e) {
      setError(e.response?.data?.error || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await attachmentAPI.delete(id);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: '#64748b' }}>
          Attachments ({attachments.length})
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Max 50MB · Images, PDFs, Videos, Text</Typography>
      </Box>

      {/* Drop Zone */}
      <Box
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        sx={{
          border: `2px dashed ${dragOver ? '#225038' : '#e2e8f0'}`,
          borderRadius: '12px',
          p: 3,
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          bgcolor: dragOver ? 'rgba(34,80,56,0.04)' : '#f8fafc',
          transition: 'all 0.2s',
          mb: 2,
          '&:hover': { borderColor: '#225038', bgcolor: 'rgba(34,80,56,0.03)' },
        }}
      >
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
        {uploading ? (
          <Box>
            <CircularProgress size={28} sx={{ color: '#225038', mb: 1 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#225038', mb: 1 }}>Uploading...</Typography>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ borderRadius: 2, height: 6, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#225038' } }}
            />
          </Box>
        ) : (
          <>
            <UploadFileIcon sx={{ fontSize: 32, color: '#94a3b8', mb: 1 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
              Drag & drop files here, or <Box component="span" sx={{ color: '#225038', fontWeight: 700 }}>click to browse</Box>
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>
              Supports images, PDFs, videos, and text files · Max 50MB
            </Typography>
          </>
        )}
      </Box>

      {error && (
        <Box sx={{ bgcolor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', px: 2, py: 1, mb: 2 }}>
          <Typography sx={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</Typography>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} sx={{ color: '#225038' }} />
        </Box>
      ) : attachments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>No attachments yet.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {attachments.map((att) => {
            const fileInfo = getFileIcon(att.filename || att.original_name, att.mimetype);
            return (
              <Card key={att.id} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', '&:hover': { borderColor: '#cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }, transition: 'all 0.15s' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: fileInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: fileInfo.color }}>
                      {fileInfo.icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.filename || att.original_name || 'Attachment'}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                        {formatBytes(att.size)} · {att.uploader_name || 'Unknown'} · {timeAgo(att.created_at)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          component="a"
                          href={attachmentAPI.downloadUrl(att.id)}
                          target="_blank"
                          rel="noopener"
                          sx={{ color: '#2563eb', '&:hover': { bgcolor: '#dbeafe' } }}
                        >
                          <DownloadIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(att.id)}
                          sx={{ color: '#94a3b8', '&:hover': { color: '#dc2626', bgcolor: '#fee2e2' } }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
