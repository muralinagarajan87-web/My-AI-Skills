const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const result = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(current_password, result.rows[0].password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashed, userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const inviteUser = async (req, res) => {
  try {
    // Only admins can invite
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { email, name, role } = req.body;
    const workspaceId = req.user.workspace_id;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // check if exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const randomPassword = Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(randomPassword, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password, name, role, workspace_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
      [email, hashed, name, role || 'tester', workspaceId]
    );

    // In a real system, you'd email this password
    res.status(201).json({
      message: 'User invited',
      user: result.rows[0],
      temporaryPassword: randomPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const result = await pool.query('SELECT id, email, name, role, workspace_id, created_at FROM users WHERE workspace_id = $1 ORDER BY id', [workspaceId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, email, name, role, workspace_id, created_at FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    // Only admins can create users
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });

    const { email, name, role, password } = req.body;
    const workspaceId = req.user.workspace_id;
    if (!email || !name) return res.status(400).json({ error: 'Email and name are required' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

    const hashed = password ? await bcrypt.hash(password, 10) : await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name, role, workspace_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
      [email, hashed, name, role || 'tester', workspaceId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    // Only admins can update users
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });

    const { id } = req.params;
    const { name, role } = req.body;
    const workspaceId = req.user.workspace_id;
    // FIX BUG-13: scope update to current workspace so admins can't edit users from other workspaces
    const result = await pool.query(
      'UPDATE users SET name = $1, role = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND workspace_id = $4 RETURNING id, email, name, role',
      [name, role, id, workspaceId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found in current workspace' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    // Only admins can delete users
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });

    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getGroups = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const result = await pool.query('SELECT id, name, description, created_at FROM groups WHERE workspace_id = $1 ORDER BY id', [workspaceId]);
    // attach member counts
    const groups = result.rows;
    for (const g of groups) {
      const cm = await pool.query('SELECT COUNT(*) FROM group_members WHERE group_id = $1', [g.id]);
      g.member_count = parseInt(cm.rows[0].count, 10);
    }
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRoles = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description, is_system, is_default FROM roles ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Role management
const createRole = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const result = await pool.query('INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id, name, description', [name, description]);
    const role = result.rows[0];
    if (Array.isArray(permissions)) {
      for (const p of permissions) {
        await pool.query('INSERT INTO role_permissions (role_id, permission) VALUES ($1, $2)', [role.id, p]);
      }
    }
    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { id } = req.params;
    const { name, description, permissions } = req.body;
    const result = await pool.query('UPDATE roles SET name = $1, description = $2 WHERE id = $3 RETURNING id, name, description', [name, description, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Role not found' });
    // replace permissions
    await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    if (Array.isArray(permissions)) {
      for (const p of permissions) {
        await pool.query('INSERT INTO role_permissions (role_id, permission) VALUES ($1, $2)', [id, p]);
      }
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { id } = req.params;
    const check = await pool.query('SELECT is_system FROM roles WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Role not found' });
    if (check.rows[0].is_system) return res.status(400).json({ error: 'System roles cannot be deleted' });
    await pool.query('DELETE FROM roles WHERE id = $1', [id]);
    res.json({ message: 'Role deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT permission FROM role_permissions WHERE role_id = $1', [id]);
    res.json(result.rows.map(r => r.permission));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Export / Import CSV
const exportUsersCSV = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const result = await pool.query('SELECT id, email, name, role, created_at FROM users WHERE workspace_id = $1 ORDER BY id', [workspaceId]);
    const rows = result.rows;
    const header = ['id','email','name','role','created_at'];
    const csv = [header.join(',')].concat(rows.map(r => `${r.id},"${r.email}","${r.name}","${r.role}","${r.created_at.toISOString()}"`)).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(csv);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const exportGroupsCSV = async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const result = await pool.query('SELECT id, name, description, created_at FROM groups WHERE workspace_id = $1 ORDER BY id', [workspaceId]);
    const rows = result.rows;
    const header = ['id','name','description','created_at'];
    const csv = [header.join(',')].concat(rows.map(r => `${r.id},"${r.name}","${r.description || ''}","${r.created_at.toISOString()}"`)).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="groups.csv"');
    res.send(csv);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const exportRolesCSV = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description FROM roles ORDER BY id');
    const rows = result.rows;
    const header = ['id','name','description','permissions'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const perms = await pool.query('SELECT permission FROM role_permissions WHERE role_id = $1', [r.id]);
      const p = perms.rows.map(x => x.permission).join('|');
      lines.push(`${r.id},"${r.name}","${r.description || ''}","${p}"`);
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="roles.csv"');
    res.send(lines.join('\n'));
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// Import expects JSON body { csv: '...' } where csv is newline-separated with header
const importUsersCSV = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv required in body' });
    const lines = csv.split(/\r?\n/).filter(Boolean);
    const header = lines.shift().split(',').map(h => h.trim().replace(/(^")|("$)/g,''));
    let created = 0;
    for (const line of lines) {
      // FIX BUG-09: guard against null match (empty/all-comma lines)
      const cols = (line.match(/(?:"([^"]*)")|([^,]+)/g) || []).map(s => s.replace(/^"|"$/g, ''));
      const obj = {};
      header.forEach((h, i) => obj[h] = cols[i] || '');
      // create user if not exists
      const exists = await pool.query('SELECT id FROM users WHERE email = $1', [obj.email]);
      if (exists.rows.length === 0) {
        const hashed = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
        await pool.query('INSERT INTO users (email, password, name, role, workspace_id) VALUES ($1, $2, $3, $4, $5)', [obj.email, hashed, obj.name || '', obj.role || 'tester', req.user.workspace_id]);
        created++;
      }
    }
    res.json({ created });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const importGroupsCSV = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv required in body' });
    const lines = csv.split(/\r?\n/).filter(Boolean);
    const header = lines.shift().split(',').map(h => h.trim().replace(/(^")|("$)/g,''));
    let created = 0;
    for (const line of lines) {
      // FIX BUG-09: guard against null match (empty/all-comma lines)
      const cols = (line.match(/(?:"([^"]*)")|([^,]+)/g) || []).map(s => s.replace(/^"|"$/g, ''));
      const obj = {};
      header.forEach((h, i) => obj[h] = cols[i] || '');
      const exists = await pool.query('SELECT id FROM groups WHERE workspace_id = $1 AND name = $2', [req.user.workspace_id, obj.name]);
      if (exists.rows.length === 0) {
        await pool.query('INSERT INTO groups (workspace_id, name, description) VALUES ($1, $2, $3)', [req.user.workspace_id, obj.name, obj.description || '']);
        created++;
      }
    }
    res.json({ created });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const importRolesCSV = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv required in body' });
    const lines = csv.split(/\r?\n/).filter(Boolean);
    const header = lines.shift().split(',').map(h => h.trim().replace(/(^")|("$)/g,''));
    let created = 0;
    for (const line of lines) {
      // FIX BUG-09: guard against null match (empty/all-comma lines)
      const cols = (line.match(/(?:"([^"]*)")|([^,]+)/g) || []).map(s => s.replace(/^"|"$/g, ''));
      const obj = {};
      header.forEach((h, i) => obj[h] = cols[i] || '');
      const exists = await pool.query('SELECT id FROM roles WHERE name = $1', [obj.name]);
      if (exists.rows.length === 0) {
        const r = await pool.query('INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id', [obj.name, obj.description || '']);
        const roleId = r.rows[0].id;
        const perms = (obj.permissions || '').split('|').map(s => s.trim()).filter(Boolean);
        for (const p of perms) {
          await pool.query('INSERT INTO role_permissions (role_id, permission) VALUES ($1, $2)', [roleId, p]);
        }
        created++;
      }
    }
    res.json({ created });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// Group management
const createGroup = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { name, description } = req.body;
    const workspaceId = req.user.workspace_id;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const result = await pool.query('INSERT INTO groups (workspace_id, name, description) VALUES ($1, $2, $3) RETURNING id, name, description', [workspaceId, name, description]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { id } = req.params;
    const { name, description } = req.body;
    const result = await pool.query('UPDATE groups SET name = $1, description = $2 WHERE id = $3 RETURNING id, name, description', [name, description, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { id } = req.params;
    await pool.query('DELETE FROM groups WHERE id = $1', [id]);
    res.json({ message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT u.id, u.email, u.name, u.role FROM users u JOIN group_members gm ON gm.user_id = u.id WHERE gm.group_id = $1', [id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addGroupMember = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { id } = req.params; // group id
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    await pool.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, user_id]);
    res.status(201).json({ message: 'Member added' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const removeGroupMember = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { id, userId } = req.params;
    await pool.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [id, userId]);
    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
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
  getRolePermissions
};
module.exports.exportUsersCSV = exportUsersCSV;
module.exports.exportGroupsCSV = exportGroupsCSV;
module.exports.exportRolesCSV = exportRolesCSV;
module.exports.importUsersCSV = importUsersCSV;
module.exports.importGroupsCSV = importGroupsCSV;
module.exports.importRolesCSV = importRolesCSV;