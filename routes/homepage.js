const express = require('express');
const { pool } = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Public — get all active sections for homepage rendering
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM homepage_sections WHERE is_active=true ORDER BY position ASC'
    );
    res.json({ sections: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin — get all sections including inactive
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM homepage_sections ORDER BY position ASC'
    );
    res.json({ sections: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { type, title, position, is_active, config } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO homepage_sections (type, title, position, is_active, config)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [type, title, position || 99, is_active !== false, JSON.stringify(config || {})]
    );
    res.json({ section: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { type, title, position, is_active, config } = req.body;
  try {
    const result = await pool.query(
      `UPDATE homepage_sections SET type=$1, title=$2, position=$3, is_active=$4, config=$5
       WHERE id=$6 RETURNING *`,
      [type, title, position, is_active, JSON.stringify(config || {}), req.params.id]
    );
    res.json({ section: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM homepage_sections WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
