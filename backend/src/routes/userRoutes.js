const express = require('express');
const {
	changePassword,
	inviteUser,
	getAllUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
	getGroups,
	createGroup,
	updateGroup,
	deleteGroup,
	getGroupMembers,
	addGroupMember,
	removeGroupMember,
	getRoles,
	createRole,
	updateRole,
	deleteRole,
	getRolePermissions,
	exportUsersCSV,
	exportGroupsCSV,
	exportRolesCSV,
	importUsersCSV,
	importGroupsCSV,
	importRolesCSV
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/change-password', authenticateToken, changePassword);
router.post('/invite', authenticateToken, inviteUser);
router.get('/', authenticateToken, getAllUsers);
router.get('/groups/list', authenticateToken, getGroups);
router.post('/groups', authenticateToken, createGroup);
router.put('/groups/:id', authenticateToken, updateGroup);
router.delete('/groups/:id', authenticateToken, deleteGroup);
router.get('/groups/:id/members', authenticateToken, getGroupMembers);
router.post('/groups/:id/members', authenticateToken, addGroupMember);
router.delete('/groups/:id/members/:userId', authenticateToken, removeGroupMember);
router.get('/roles/list', authenticateToken, getRoles);
router.post('/roles', authenticateToken, createRole);
router.put('/roles/:id', authenticateToken, updateRole);
router.delete('/roles/:id', authenticateToken, deleteRole);
router.get('/roles/:id/permissions', authenticateToken, getRolePermissions);
// Export / Import
router.get('/export/users', authenticateToken, exportUsersCSV);
router.get('/export/groups', authenticateToken, exportGroupsCSV);
router.get('/export/roles', authenticateToken, exportRolesCSV);
router.post('/import/users', authenticateToken, importUsersCSV);
router.post('/import/groups', authenticateToken, importGroupsCSV);
router.post('/import/roles', authenticateToken, importRolesCSV);
router.get('/:id', authenticateToken, getUserById);
router.post('/', authenticateToken, createUser);
router.put('/:id', authenticateToken, updateUser);
router.delete('/:id', authenticateToken, deleteUser);

module.exports = router;
