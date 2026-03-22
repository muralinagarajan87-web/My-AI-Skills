import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Avatar, TextField, Button, IconButton,
  Card, CardContent, Divider, CircularProgress
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { commentAPI } from '../services/api';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function HighlightMentions({ text }) {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^@\w+$/.test(part) ? (
          <Box component="span" key={i} sx={{ color: '#2563eb', fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
            {part}
          </Box>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export default function CommentThread({ entityType, entityId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const user = currentUser || JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (entityId) load();
  }, [entityType, entityId]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await commentAPI.getAll(entityType, entityId);
      setComments(r.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await commentAPI.create({
        entity_type: entityType,
        entity_id: entityId,
        content: newComment.trim(),
      });
      setNewComment('');
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentAPI.delete(id);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (comment) => {
    setEditingId(comment.id);
    setEditText(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (id) => {
    if (!editText.trim()) return;
    try {
      await commentAPI.update(id, { content: editText.trim() });
      setEditingId(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: '#64748b', mb: 2 }}>
        Comments ({comments.length})
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} sx={{ color: '#225038' }} />
        </Box>
      ) : comments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0', mb: 2 }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 500 }}>
            No comments yet. Be the first to comment.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
          {comments.map((comment) => {
            const isAuthor = String(comment.user_id) === String(user.id) || comment.author_name === user.name;
            const initials = getInitials(comment.author_name || comment.user_name || 'User');
            return (
              <Card key={comment.id} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 800, bgcolor: '#225038', color: 'white', flexShrink: 0 }}>
                      {initials}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                            {comment.author_name || comment.user_name || 'User'}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                            {timeAgo(comment.created_at)}
                          </Typography>
                          {comment.updated_at && comment.updated_at !== comment.created_at && (
                            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontStyle: 'italic' }}>(edited)</Typography>
                          )}
                        </Box>
                        {isAuthor && editingId !== comment.id && (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" onClick={() => startEdit(comment)}
                              sx={{ color: '#64748b', '&:hover': { color: '#225038', bgcolor: '#f0fdf4' } }}>
                              <EditOutlinedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDelete(comment.id)}
                              sx={{ color: '#64748b', '&:hover': { color: '#dc2626', bgcolor: '#fee2e2' } }}>
                              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                        )}
                      </Box>

                      {editingId === comment.id ? (
                        <Box>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            size="small"
                            sx={{ mb: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: 13 } }}
                          />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" variant="contained" startIcon={<CheckIcon sx={{ fontSize: 13 }} />}
                              onClick={() => saveEdit(comment.id)}
                              sx={{ bgcolor: '#225038', borderRadius: '8px', fontSize: 12, fontWeight: 700, '&:hover': { bgcolor: '#1a3d2b' } }}>
                              Save
                            </Button>
                            <Button size="small" variant="outlined" startIcon={<CloseIcon sx={{ fontSize: 13 }} />}
                              onClick={cancelEdit}
                              sx={{ borderRadius: '8px', fontSize: 12 }}>
                              Cancel
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          <HighlightMentions text={comment.content} />
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 800, bgcolor: '#4ade80', color: '#1a3d2b', flexShrink: 0, mt: 0.5 }}>
          {getInitials(user.name)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Add a comment... Use @username to mention someone"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            size="small"
            sx={{
              mb: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px', fontSize: 13,
                '&:hover fieldset': { borderColor: '#225038' },
                '&.Mui-focused fieldset': { borderColor: '#225038' },
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Ctrl+Enter to submit</Typography>
            <Button
              variant="contained"
              size="small"
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
              sx={{
                bgcolor: '#225038', borderRadius: '8px', fontSize: 12, fontWeight: 700,
                '&:hover': { bgcolor: '#1a3d2b' },
                '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' }
              }}
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
