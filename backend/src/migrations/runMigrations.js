const { createTables } = require('./initDatabase');
const pool = require('../config/database');

const runMigrations = async () => {
  try {
    console.log('Starting migrations...');
    await createTables();
    console.log('✓ Migrations completed successfully');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();
