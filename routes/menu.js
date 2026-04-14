const express = require('express');
const { pool } = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_items ORDER BY position ASC');
    res.json({ items: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { label, url, page_type, position, is_active } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO menu_items (label, url, page_type, position, is_active) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [label, url, page_type, position || 99, is_active !== false]
    );
    res.json({ item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { label, url, page_type, position, is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE menu_items SET label=$1, url=$2, page_type=$3, position=$4, is_active=$5 WHERE id=$6 RETURNING *',
      [label, url, page_type, position, is_active, req.params.id]
    );
    res.json({ item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM menu_items WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
