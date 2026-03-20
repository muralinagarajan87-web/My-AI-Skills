import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Button, Menu, MenuItem } from '@mui/material';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TestCasesPage from './pages/TestCasesPage';
import TestRunPage from './pages/TestRunPage';
import TestRunsPage from './pages/TestRunsPage';
import TemplatesPage from './pages/TemplatesPage';
import ProjectsPage from './pages/ProjectsPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import MilestonesPage from './pages/MilestonesPage';
import MilestonePage from './pages/MilestonePage';
import './App.css';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/auth" />;
}

function Navigation() {
  const [anchorEl, setAnchorEl] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
  };

  return (
    <AppBar position="static" color="primary">
      <Toolbar sx={{ gap: 2 }}>
        <Box component="a" href="/dashboard" sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none' }}>
          <img src="/brand-logo.png" alt="Flywl" style={{ height: 36 }} />
        </Box>
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, ml: 2 }}>
          <Button color="inherit" href="/dashboard">Dashboard</Button>
          <Button color="inherit" href="/test-cases">Test Cases</Button>
          <Button color="inherit" href="/test-runs">Test Runs</Button>
          <Button color="inherit" href="/templates">Templates</Button>
          <Button color="inherit" href="/projects">Projects</Button>
          <Button color="inherit" href="/milestones">Milestones</Button>
          <Button color="inherit" href="/settings">Settings</Button>
          <Button color="inherit" href="/users">Users</Button>
        </Box>
        <Button color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
          {user.name || 'User'} ▼
        </Button>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem>{user.email}</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default function App() {
  const token = localStorage.getItem('token');

  return (
    <BrowserRouter>
      {token && <Navigation />}
      <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/projects"
            element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>}
          />
          <Route
            path="/templates"
            element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>}
          />
          <Route
            path="/test-cases"
            element={<ProtectedRoute><TestCasesPage /></ProtectedRoute>}
          />
          <Route
            path="/test-runs"
            element={<ProtectedRoute><TestRunsPage /></ProtectedRoute>}
          />
          <Route
            path="/test-run/:id"
            element={<ProtectedRoute><TestRunPage /></ProtectedRoute>}
          />
          <Route
            path="/settings"
            element={<ProtectedRoute><SettingsPage /></ProtectedRoute>}
          />
          <Route
            path="/users"
            element={<ProtectedRoute><UsersPage /></ProtectedRoute>}
          />
          <Route
            path="/milestones"
            element={<ProtectedRoute><MilestonesPage /></ProtectedRoute>}
          />
          <Route
            path="/milestone/:id"
            element={<ProtectedRoute><MilestonePage /></ProtectedRoute>}
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}
