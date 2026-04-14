const bcrypt = require('bcryptjs');
const { pool } = require('./db/pool');

async function setup() {
  const email = process.env.ADMIN_EMAIL;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME || 'Shindig Kitchen';

  if (!email || !password) {
    console.error('ERROR: Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables first');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (email, username, password, display_name, role)
       VALUES ($1, $2, $3, $4, 'admin')
       ON CONFLICT (email) DO UPDATE SET password=$3, role='admin'`,
      [email, username, hash, displayName]
    );
    console.log(`Admin account created: ${email}`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err.message);
    process.exit(1);
  }
}

setup();
