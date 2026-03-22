import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, AppBar, Toolbar, Button, Menu, MenuItem, Typography, Avatar, Divider, Tooltip } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
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
import DefectsPage from './pages/DefectsPage';
import RequirementsPage from './pages/RequirementsPage';
import AIFeaturesPage from './pages/AIFeaturesPage';
import './App.css';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/auth" />;
}

const NAV_LINKS = [
  { label: 'Dashboard',  href: '/dashboard'  },
  { label: 'Test Cases', href: '/test-cases'  },
  { label: 'Test Runs',  href: '/test-runs'   },
  { label: 'Templates',  href: '/templates'   },
  { label: 'Projects',   href: '/projects'    },
  { label: 'Milestones',    href: '/milestones'     },
  { label: 'Defects',      href: '/defects'        },
  { label: 'Requirements', href: '/requirements'   },
  { label: 'AI',           href: '/ai'             },
  { label: 'Settings',     href: '/settings'       },
  { label: 'Users',      href: '/users'       },
];

function NavButton({ href, label, active }) {
  return (
    <Button
      component={RouterLink}
      to={href}
      disableRipple={false}
      sx={{
        position: 'relative',
        color: active ? '#ffffff' : 'rgba(255,255,255,0.62)',
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        letterSpacing: 0.25,
        px: 1.6,
        py: 0.85,
        minWidth: 0,
        borderRadius: '9px',
        bgcolor: active ? 'rgba(255,255,255,0.13)' : 'transparent',
        textTransform: 'none',
        '&:hover': {
          color: '#ffffff',
          bgcolor: 'rgba(255,255,255,0.09)',
        },
        '&:active': {
          bgcolor: 'rgba(255,255,255,0.22)',
          transform: 'scale(0.96)',
        },
        transition: 'background 0.16s ease, color 0.16s ease, transform 0.1s ease',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 5,
          left: '50%',
          transform: 'translateX(-50%)',
          width: active ? '55%' : '0%',
          height: 3,
          borderRadius: 99,
          bgcolor: '#4ade80',
          transition: 'width 0.22s ease',
        },
        '&:hover::after': {
          width: active ? '55%' : '30%',
          bgcolor: active ? '#4ade80' : 'rgba(255,255,255,0.3)',
        },
      }}
    >
      {label}
    </Button>
  );
}

function Navigation() {
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'linear-gradient(90deg, #152e1f 0%, #1e4533 50%, #225038 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        zIndex: 1200,
      }}
    >
      <Toolbar sx={{ minHeight: '54px !important', px: { xs: 2, md: 3 }, gap: 0 }}>

        {/* Logo */}
        <Box
          component={RouterLink}
          to="/dashboard"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', mr: 2.5, flexShrink: 0 }}
        >
          <img src="/brand-logo.png" alt="Flywl" style={{ height: 34 }} />
        </Box>

        {/* Nav links */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 0.25, alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
          {NAV_LINKS.map(link => {
            const active =
              location.pathname === link.href ||
              (link.href !== '/dashboard' && location.pathname.startsWith(link.href));
            return <NavButton key={link.href} href={link.href} label={link.label} active={active} />;
          })}
        </Box>

        {/* User menu */}
        <Tooltip title="Account" arrow>
          <Button
            onClick={e => setAnchorEl(e.currentTarget)}
            sx={{
              ml: 1.5, flexShrink: 0,
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13, fontWeight: 600,
              textTransform: 'none',
              borderRadius: '10px',
              px: 1.25, py: 0.6,
              bgcolor: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', gap: 1,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.13)', borderColor: 'rgba(255,255,255,0.22)' },
              '&:active': { transform: 'scale(0.97)' },
              transition: 'all 0.15s ease',
            }}
          >
            <Avatar
              sx={{ width: 24, height: 24, fontSize: 11, fontWeight: 800,
                bgcolor: '#4ade80', color: '#1a3d2b' }}
            >
              {initials}
            </Avatar>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'white', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name || 'User'}
            </Typography>
            <KeyboardArrowDownIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)',
              transform: anchorEl ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </Button>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 8,
            sx: {
              mt: 1, borderRadius: '12px', minWidth: 200,
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              overflow: 'visible',
              '&::before': {
                content: '""', display: 'block', position: 'absolute',
                top: -6, right: 18, width: 12, height: 12,
                bgcolor: 'background.paper', transform: 'rotate(45deg)',
                borderTop: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0',
              },
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{user.name}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{user.email}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { setAnchorEl(null); window.location.href = '/settings'; }}
            sx={{ fontSize: 13, gap: 1.5, py: 1.25, '&:hover': { bgcolor: '#f0fdf4', color: '#225038' } }}>
            <PersonOutlineIcon sx={{ fontSize: 18 }} /> Settings
          </MenuItem>
          <MenuItem onClick={handleLogout}
            sx={{ fontSize: 13, gap: 1.5, py: 1.25, color: '#dc2626', '&:hover': { bgcolor: '#fee2e2' } }}>
            <LogoutIcon sx={{ fontSize: 18 }} /> Logout
          </MenuItem>
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
          <Route path="/auth"        element={<AuthPage />} />
          <Route path="/dashboard"   element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/projects"    element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
          <Route path="/templates"   element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
          <Route path="/test-cases"  element={<ProtectedRoute><TestCasesPage /></ProtectedRoute>} />
          <Route path="/test-runs"   element={<ProtectedRoute><TestRunsPage /></ProtectedRoute>} />
          <Route path="/test-run/:id" element={<ProtectedRoute><TestRunPage /></ProtectedRoute>} />
          <Route path="/settings"    element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/users"       element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
          <Route path="/milestones"    element={<ProtectedRoute><MilestonesPage /></ProtectedRoute>} />
          <Route path="/milestone/:id" element={<ProtectedRoute><MilestonePage /></ProtectedRoute>} />
          <Route path="/defects"       element={<ProtectedRoute><DefectsPage /></ProtectedRoute>} />
          <Route path="/requirements"  element={<ProtectedRoute><RequirementsPage /></ProtectedRoute>} />
          <Route path="/ai"            element={<ProtectedRoute><AIFeaturesPage /></ProtectedRoute>} />
          <Route path="/"            element={<Navigate to="/dashboard" />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}
