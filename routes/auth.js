const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/pool');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, username, password, display_name } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username and password are required' });
  }
  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email=$1 OR username=$2', [email, username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (email, username, password, display_name) VALUES ($1,$2,$3,$4) RETURNING id, username, display_name, role',
      [email, username, hash, display_name || username]
    );
    const user = result.rows[0];
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    res.json({ user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    res.json({ user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ user: { id: req.session.userId, username: req.session.username, role: req.session.role } });
  } else {
    res.json({ user: null });
  }
});

module.exports = router;
