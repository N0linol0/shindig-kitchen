const express = require('express');
const { pool } = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM content_strip_items WHERE is_active=true ORDER BY position ASC'
    );
    res.json({ items: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM content_strip_items ORDER BY position ASC');
    res.json({ items: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { label, link_type, url, category_slug, position, is_active } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO content_strip_items (label, link_type, url, category_slug, position, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [label, link_type || 'category', url, category_slug || '', position || 99, is_active !== false]
    );
    res.json({ item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { label, link_type, url, category_slug, position, is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE content_strip_items SET label=$1, link_type=$2, url=$3, category_slug=$4, position=$5, is_active=$6 WHERE id=$7 RETURNING *',
      [label, link_type, url, category_slug, position, is_active, req.params.id]
    );
    res.json({ item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM content_strip_items WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
