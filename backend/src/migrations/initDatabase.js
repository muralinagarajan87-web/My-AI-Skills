const pool = require('../config/database');

const createTables = async () => {
  try {
    console.log('Creating database tables...');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'tester',
        workspace_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Workspaces table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        owner_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        fields JSONB NOT NULL DEFAULT '[]',
        is_default BOOLEAN DEFAULT FALSE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Test Cases table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id),
        template_id INTEGER REFERENCES templates(id),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        steps JSONB,
        expected_result TEXT,
        priority VARCHAR(30) DEFAULT 'Medium',
        status VARCHAR(50) DEFAULT 'Draft',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Test Case Versions table for edit history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_case_versions (
        id SERIAL PRIMARY KEY,
        test_case_id INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
        version_number INTEGER,
        title VARCHAR(500),
        description TEXT,
        steps JSONB,
        expected_result TEXT,
        priority VARCHAR(30),
        status VARCHAR(50),
        changed_by INTEGER REFERENCES users(id),
        change_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Test Runs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_runs (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'In Progress',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Test Run Results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_results (
        id SERIAL PRIMARY KEY,
        test_run_id INTEGER REFERENCES test_runs(id) ON DELETE CASCADE,
        test_case_id INTEGER REFERENCES test_cases(id),
        assigned_to INTEGER REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'Not Started',
        result VARCHAR(50),
        comments TEXT,
        attachments JSONB,
        executed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Audit Log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id),
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100),
        entity_type VARCHAR(100),
        entity_id INTEGER,
        old_value JSONB,
        new_value JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Roles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Role permissions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission VARCHAR(255) NOT NULL
      );
    `);

    // Groups table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Group members
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_test_cases_workspace ON test_cases(workspace_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_test_runs_workspace ON test_runs(workspace_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_test_results_run ON test_results(test_run_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_log_workspace ON audit_log(workspace_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_templates_workspace ON templates(workspace_id);');

    // Ensure field_values column exists for dynamic template data (new feature)
    await pool.query("ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS field_values JSONB DEFAULT '{}'::jsonb;");
    await pool.query("ALTER TABLE test_case_versions ADD COLUMN IF NOT EXISTS field_values JSONB;");

    // Milestones table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        refs TEXT,
        start_date DATE,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'Open',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add milestone_id to test_runs (safe, idempotent)
    await pool.query("ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS milestone_id INTEGER REFERENCES milestones(id) ON DELETE SET NULL;");

    console.log('✓ All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

module.exports = { createTables };
