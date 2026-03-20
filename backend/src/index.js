const express = require('express');
const cors = require('cors');
require('dotenv').config();
const dbPool = require('./config/database');

// Routes
const authRoutes = require('./routes/authRoutes');
const templateRoutes = require('./routes/templateRoutes');
const testCaseRoutes = require('./routes/testCaseRoutes');
const testRunRoutes = require('./routes/testRunRoutes');
const reportRoutes = require('./routes/reportRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const userRoutes = require('./routes/userRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/test-cases', testCaseRoutes);
app.use('/api/test-runs', testRunRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/milestones', milestoneRoutes);

// Test database connection
app.get('/api/db-check', async (req, res) => {
  try {
    const result = await dbPool.query('SELECT NOW()');
    res.json({ database: 'connected', time: result.rows[0] });
  } catch (error) {
    res.status(500).json({ database: 'error', message: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message,
    timestamp: new Date()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
