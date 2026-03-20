import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab, Select, MenuItem, FormControl, InputLabel, Checkbox, FormControlLabel } from '@mui/material';
import { userAPI } from '../services/api';

function UsersTab({ onOpenEdit }) {
  const [users, setUsers] = useState([]);
  const fileInputRef = React.createRef();
  useEffect(() => { load(); }, []);
  const load = async () => { try { const r = await userAPI.getAll(); setUsers(r.data); } catch(e){console.error(e)} };
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Users</Typography>
        <Box>
          <Button variant="outlined" sx={{ mr: 1 }} onClick={async () => {
            try {
              const blob = await userAPI.exportUsers();
              const url = window.URL.createObjectURL(blob.data);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'users.csv';
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (e) { console.error(e); alert('Export failed'); }
          }}>Export</Button>
          <Button variant="outlined" sx={{ mr: 1 }} onClick={() => fileInputRef.current?.click()}>Import</Button>
          <Button variant="contained" onClick={() => onOpenEdit(null)}>+ Add User</Button>
        </Box>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Login Type</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.login_type || 'Local'}</TableCell>
                <TableCell>{u.role || '-'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => onOpenEdit(u)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const txt = await f.text();
        try {
          const r = await userAPI.importUsers({ csv: txt });
          alert(`Imported ${r.data.created} users`);
          const re = await userAPI.getAll(); setUsers(re.data);
        } catch (err) { console.error(err); alert('Import failed'); }
      }} />
    </Box>
  );
}

function GroupsTab() {
  const [groups, setGroups] = useState([]);
  const groupFileRef = React.createRef();
  useEffect(() => { load(); }, []);
  const load = async () => { try { const r = await userAPI.getGroups(); setGroups(r.data); } catch(e){console.error(e)} };
  return (
    <>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Groups</Typography>
          <Box>
            <Button variant="outlined" sx={{ mr: 1 }} onClick={async () => {
              try {
                const blob = await userAPI.exportGroups();
                const url = window.URL.createObjectURL(blob.data);
                const a = document.createElement('a'); a.href = url; a.download = 'groups.csv'; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
              } catch (e) { console.error(e); alert('Export failed'); }
            }}>Export</Button>
            <Button variant="outlined" sx={{ mr: 1 }} onClick={() => groupFileRef.current?.click()}>Import</Button>
            <Button variant="contained">+ Add Group</Button>
          </Box>
        </Box>
        <Paper sx={{ p: 2 }}>
          {groups.length === 0 ? <Typography sx={{ color: 'text.secondary' }}>No groups yet.</Typography> : (
            groups.map(g => (
              <Box key={g.id} sx={{ mb: 1 }}>{g.name} — <Typography component="span" sx={{ color: 'text.secondary' }}>{g.member_count} members</Typography></Box>
            ))
          )}
        </Paper>
      </Box>
      <input type="file" accept=".csv" ref={groupFileRef} style={{ display: 'none' }} onChange={async (e) => {
        const f = e.target.files[0]; if (!f) return; const txt = await f.text(); try { const r = await userAPI.importGroups({ csv: txt }); alert(`Imported ${r.data.created} groups`); const re = await userAPI.getGroups(); setGroups(re.data); } catch (err) { console.error(err); alert('Import failed'); }
      }} />
    </>
  );
}

function RolesTab() {
  const [roles, setRoles] = useState([]);
  useEffect(() => { load(); }, []);
  const load = async () => { try { const r = await userAPI.getRoles(); setRoles(r.data); } catch(e){console.error(e)} };
  const [editingRole, setEditingRole] = useState(null);

  const openEditRole = (role) => setEditingRole(role || { name: '', description: '', permissions: [] });
  const closeEditRole = () => setEditingRole(null);
  const saveRole = async () => {
    try {
      if (editingRole.id) await userAPI.updateRole(editingRole.id, editingRole);
      else await userAPI.createRole(editingRole);
      const r = await userAPI.getRoles(); setRoles(r.data);
      closeEditRole();
    } catch (e) { console.error(e); }
  };
  const removeRole = async (id) => { try { await userAPI.deleteRole(id); const r = await userAPI.getRoles(); setRoles(r.data); } catch(e){console.error(e)} };
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Roles</Typography>
        <Box>
          <Button variant="outlined" sx={{ mr: 1 }} onClick={async () => {
            try {
              const blob = await userAPI.exportRoles();
              const url = window.URL.createObjectURL(blob.data);
              const a = document.createElement('a'); a.href = url; a.download = 'roles.csv'; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
            } catch (e) { console.error(e); alert('Export failed'); }
          }}>Export</Button>
          <Button variant="outlined" sx={{ mr: 1 }} onClick={() => document.getElementById('roles-import')?.click()}>Import</Button>
          <Button variant="contained" onClick={() => openEditRole(null)}>+ Add Role</Button>
        </Box>
      </Box>
      <Paper sx={{ p: 2 }}>
        {roles.length === 0 ? <Typography sx={{ color: 'text.secondary' }}>No roles defined.</Typography> : (
          roles.map(r => (
            <Box key={r.id} sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontWeight: 'bold' }}>{r.name}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{r.description}</Typography>
              </Box>
              <Box>
                <Button size="small" onClick={() => openEditRole(r)} sx={{ mr: 1 }}>Edit</Button>
                <Button size="small" color="error" onClick={() => removeRole(r.id)}>Delete</Button>
              </Box>
            </Box>
          ))
        )}
      </Paper>

      <Dialog open={Boolean(editingRole)} onClose={closeEditRole} fullWidth maxWidth="sm">
        <DialogTitle>{editingRole?.id ? 'Edit Role' : 'Add Role'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={editingRole?.name || ''} onChange={(e) => setEditingRole(prev => ({ ...prev, name: e.target.value }))} sx={{ my: 1 }} />
          <TextField fullWidth label="Description" value={editingRole?.description || ''} onChange={(e) => setEditingRole(prev => ({ ...prev, description: e.target.value }))} sx={{ my: 1 }} />
          <TextField fullWidth label="Permissions (comma separated)" value={(editingRole?.permissions || []).join(',')} onChange={(e) => setEditingRole(prev => ({ ...prev, permissions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} sx={{ my: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditRole}>Cancel</Button>
          <Button variant="contained" onClick={saveRole}>Save</Button>
        </DialogActions>
      </Dialog>
      <input type="file" accept=".csv" id="roles-import" style={{ display: 'none' }} onChange={async (e) => {
        const f = e.target.files[0]; if (!f) return; const txt = await f.text(); try { const r = await userAPI.importRoles({ csv: txt }); alert(`Imported ${r.data.created} roles`); const re = await userAPI.getRoles(); setRoles(re.data); } catch (err) { console.error(err); alert('Import failed'); }
      }} />
    </Box>
  );
}

export default function UsersPage() {
  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState(null);
  const [roles, setRoles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupDialog, setGroupDialog] = useState({ open: false, user: null, memberships: {} });

  const handleOpenEdit = (user) => setEditing(user || { name: '', email: '', role: '' });
  const handleCloseEdit = () => { setEditing(null); };

  const handleSave = async () => {
    try {
      if (editing.id) await userAPI.update(editing.id, editing);
      else await userAPI.create(editing);
      handleCloseEdit();
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await userAPI.getRoles();
        setRoles(r.data);
        const g = await userAPI.getGroups();
        setGroups(g.data);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const openGroupDialog = async (user) => {
    // build membership map by checking each group's members
    const memberships = {};
    try {
      for (const gr of groups) {
        const members = await userAPI.getGroupMembers(gr.id);
        memberships[gr.id] = members.data.some(m => m.id === user.id);
      }
    } catch (e) { console.error(e); }
    setGroupDialog({ open: true, user, memberships });
  };

  const closeGroupDialog = () => setGroupDialog({ open: false, user: null, memberships: {} });

  const toggleGroupMembership = async (groupId, checked) => {
    try {
      if (checked) {
        await userAPI.addGroupMember(groupId, groupDialog.user.id);
      } else {
        await userAPI.removeGroupMember(groupId, groupDialog.user.id);
      }
      setGroupDialog(prev => ({ ...prev, memberships: { ...prev.memberships, [groupId]: checked } }));
    } catch (e) { console.error(e); }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Users & Roles</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Users" />
        <Tab label="Groups" />
        <Tab label="Roles" />
      </Tabs>

      {tab === 0 && <UsersTab onOpenEdit={handleOpenEdit} />}
      {tab === 1 && <GroupsTab />}
      {tab === 2 && <RolesTab />}

      <Dialog open={Boolean(editing)} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogTitle>{editing?.id ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={editing?.name || ''} onChange={(e) => setEditing(prev => ({ ...prev, name: e.target.value }))} sx={{ my: 1 }} />
          <TextField fullWidth label="Email" value={editing?.email || ''} onChange={(e) => setEditing(prev => ({ ...prev, email: e.target.value }))} sx={{ my: 1 }} />
          <FormControl fullWidth sx={{ my: 1 }}>
            <InputLabel id="role-label">Role</InputLabel>
            <Select labelId="role-label" label="Role" value={editing?.role || ''} onChange={(e) => setEditing(prev => ({ ...prev, role: e.target.value }))}>
              {roles.map(r => <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            {editing?.id && <Button onClick={() => openGroupDialog(editing)} sx={{ mr: 1 }}>Manage Groups</Button>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={groupDialog.open} onClose={closeGroupDialog} fullWidth maxWidth="sm">
        <DialogTitle>Manage Groups for {groupDialog.user?.name}</DialogTitle>
        <DialogContent>
          {groups.map(g => (
            <FormControlLabel key={g.id} control={<Checkbox checked={!!groupDialog.memberships[g.id]} onChange={(e) => toggleGroupMembership(g.id, e.target.checked)} />} label={`${g.name} (${g.member_count || 0})`} sx={{ display: 'block' }} />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeGroupDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
