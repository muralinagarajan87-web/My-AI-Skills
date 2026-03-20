const bcrypt = require('bcryptjs');
const jwt = require('jwt-simple');
const pool = require('../config/database');
require('dotenv').config();

const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create workspace for user
    const workspaceResult = await pool.query(
      'INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id',
      [`${name}'s Workspace`, null]
    );
    const workspaceId = workspaceResult.rows[0].id;

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password, name, role, workspace_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
      [email, hashedPassword, name, 'admin', workspaceId]
    );

    // Update workspace owner
    await pool.query('UPDATE workspaces SET owner_id = $1 WHERE id = $2', [result.rows[0].id, workspaceId]);

    const user = result.rows[0];
    const token = jwt.encode({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET);

    res.status(201).json({
      message: 'User created successfully',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.encode({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET);

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name, role: user.role, workspace_id: user.workspace_id },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('SELECT id, email, name, role, workspace_id FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { signup, login, getProfile };
