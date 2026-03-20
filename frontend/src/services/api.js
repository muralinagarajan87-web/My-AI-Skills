import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  signup: (email, password, name) =>
    api.post('/auth/signup', { email, password, name }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/profile')
};

// Template APIs
export const templateAPI = {
  create: (data) => api.post('/templates', data),
  getAll: () => api.get('/templates'),
  get: (id) => api.get(`/templates/${id}`),
  update: (id, data) => api.put(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`)
};

// Workspace (Project) APIs
export const workspaceAPI = {
  getAll: () => api.get('/workspaces'),
  get: (id) => api.get(`/workspaces/${id}`),
  create: (data) => api.post('/workspaces', data),
  switch: (id) => api.post(`/workspaces/${id}/switch`)
};

// Test Case APIs
export const testCaseAPI = {
  create: (data) => api.post('/test-cases', data),
  getAll: () => api.get('/test-cases'),
  get: (id) => api.get(`/test-cases/${id}`),
  update: (id, data) => api.put(`/test-cases/${id}`, data),
  delete: (id) => api.delete(`/test-cases/${id}`),
  clone: (id) => api.post(`/test-cases/${id}/clone`)
};

// Test Run APIs
export const testRunAPI = {
  create: (data) => api.post('/test-runs', data),
  getAll: () => api.get('/test-runs'),
  get: (id) => api.get(`/test-runs/${id}`),
  updateStatus: (id, status) =>
    api.put(`/test-runs/${id}/status`, { status }),
  updateResult: (id, data) =>
    api.put(`/test-runs/result/${id}`, data)
};

// Report APIs
export const reportAPI = {
  getMetrics: (runId) => api.get('/reports/metrics', { params: runId ? { run_id: runId } : {} }),
  getAuditLog: () => api.get('/reports/audit-log'),
  getHistory: (testCaseId) => api.get(`/reports/history/${testCaseId}`),
  getTestCaseResults: (testCaseId) => api.get(`/reports/results/${testCaseId}`)
};

// Upload APIs
export const uploadAPI = {
  uploadFile: (file, templateId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (templateId) formData.append('template_id', templateId);
    return api.post('/upload/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  previewFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  importWithMapping: (tempId, tempExt, mapping, templateId) =>
    api.post('/upload/import', { tempId, tempExt, mapping, template_id: templateId }),
  downloadExcel: () => api.get('/upload/download/excel', { responseType: 'blob' }),
  downloadCSV: () => api.get('/upload/download/csv', { responseType: 'blob' })
};

// User APIs
export const userAPI = {
  changePassword: (currentPassword, newPassword) =>
    api.post('/users/change-password', { current_password: currentPassword, new_password: newPassword }),
  inviteUser: (email, name, role) =>
    api.post('/users/invite', { email, name, role })
};

// Extended user management endpoints used by the admin UI
userAPI.getAll = () => api.get('/users');
userAPI.get = (id) => api.get(`/users/${id}`);
userAPI.create = (data) => api.post('/users', data);
userAPI.update = (id, data) => api.put(`/users/${id}`, data);
userAPI.delete = (id) => api.delete(`/users/${id}`);
userAPI.getGroups = () => api.get('/users/groups/list');
userAPI.getRoles = () => api.get('/users/roles/list');
userAPI.createGroup = (data) => api.post('/users/groups', data);
userAPI.getGroupMembers = (groupId) => api.get(`/users/groups/${groupId}/members`);
userAPI.addGroupMember = (groupId, userId) => api.post(`/users/groups/${groupId}/members`, { user_id: userId });
userAPI.removeGroupMember = (groupId, userId) => api.delete(`/users/groups/${groupId}/members/${userId}`);
userAPI.createRole = (data) => api.post('/users/roles', data);
userAPI.updateRole = (id, data) => api.put(`/users/roles/${id}`, data);
userAPI.deleteRole = (id) => api.delete(`/users/roles/${id}`);
userAPI.getRolePermissions = (id) => api.get(`/users/roles/${id}/permissions`);
userAPI.exportUsers = () => api.get('/users/export/users', { responseType: 'blob' });
userAPI.exportGroups = () => api.get('/users/export/groups', { responseType: 'blob' });
userAPI.exportRoles = () => api.get('/users/export/roles', { responseType: 'blob' });
userAPI.importUsers = (data) => api.post('/users/import/users', data);
userAPI.importGroups = (data) => api.post('/users/import/groups', data);
userAPI.importRoles = (data) => api.post('/users/import/roles', data);

export const milestoneAPI = {
  create: (data) => api.post('/milestones', data),
  getAll: () => api.get('/milestones'),
  get: (id) => api.get(`/milestones/${id}`),
  update: (id, data) => api.put(`/milestones/${id}`, data),
  delete: (id) => api.delete(`/milestones/${id}`)
};

export default api;
