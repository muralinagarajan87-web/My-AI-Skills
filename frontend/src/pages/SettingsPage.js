import React, { useState } from 'react';
import {
  Container, Paper, Typography, Box, TextField, Button, Alert, Divider
} from '@mui/material';
import { userAPI } from '../services/api';

export default function SettingsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('tester');
  const [inviteMessage, setInviteMessage] = useState(null);

  const handleChangePassword = async () => {
    setPasswordMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Please fill all password fields.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      await userAPI.changePassword(currentPassword, newPassword);
      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMessage({
        type: 'error',
        text: err.response?.data?.error || 'Error updating password'
      });
    }
  };

  const handleInvite = async () => {
    setInviteMessage(null);

    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteMessage({ type: 'error', text: 'Name and email are required.' });
      return;
    }

    try {
      const response = await userAPI.inviteUser(inviteEmail.trim(), inviteName.trim(), inviteRole);
      setInviteMessage({
        type: 'success',
        text: `Invited ${response.data.user.email}. Temporary password: ${response.data.temporaryPassword}`
      });
      setInviteEmail('');
      setInviteName('');
    } catch (err) {
      setInviteMessage({
        type: 'error',
        text: err.response?.data?.error || 'Error inviting user'
      });
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>Settings</Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Account</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Name: {user.name} • Email: {user.email} • Role: {user.role}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" sx={{ mb: 1 }}>Change Password</Typography>
        {passwordMessage && (
          <Alert severity={passwordMessage.type} sx={{ mb: 2 }}>
            {passwordMessage.text}
          </Alert>
        )}
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField
            type="password"
            label="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            type="password"
            label="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <TextField
            type="password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button variant="contained" onClick={handleChangePassword}>
            Update password
          </Button>
        </Box>
      </Paper>

      {user.role === 'admin' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Invite user</Typography>
          {inviteMessage && (
            <Alert severity={inviteMessage.type} sx={{ mb: 2 }}>
              {inviteMessage.text}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
            <TextField
              label="Email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <TextField
              select
              label="Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="tester">Tester</option>
              <option value="admin">Admin</option>
            </TextField>
            <Button variant="contained" onClick={handleInvite}>
              Send invite
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
}
