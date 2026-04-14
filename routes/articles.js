const express = require('express');
const { pool } = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Public - published articles
router.get('/', async (req, res) => {
  const { category, limit = 12, offset = 0 } = req.query;
  try {
    let query = `SELECT a.*, u.display_name as author_name
      FROM articles a LEFT JOIN users u ON a.author_id = u.id
      WHERE a.is_published = true`;
    const params = [];
    if (category) { params.push(category); query += ` AND a.category = $${params.length}`; }
    params.push(limit); query += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;
    params.push(offset); query += ` OFFSET $${params.length}`;
    const result = await pool.query(query, params);
    res.json({ articles: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.display_name as author_name
      FROM articles a LEFT JOIN users u ON a.author_id = u.id
      WHERE a.slug = $1 AND a.is_published = true
    `, [req.params.slug]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Article not found' });
    res.json({ article: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin - all articles
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.display_name as author_name FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.created_at DESC
    `);
    res.json({ articles: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { title, slug, subtitle, body, image_url, category, tags, is_published, featured } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO articles (title, slug, subtitle, body, image_url, category, tags, is_published, featured, author_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [title, slug, subtitle, body, image_url, category, tags || [], is_published || false, featured || false, req.session.userId]);
    res.json({ article: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { title, slug, subtitle, body, image_url, category, tags, is_published, featured } = req.body;
  try {
    const result = await pool.query(`
      UPDATE articles SET title=$1, slug=$2, subtitle=$3, body=$4, image_url=$5,
      category=$6, tags=$7, is_published=$8, featured=$9, updated_at=NOW()
      WHERE id=$10 RETURNING *
    `, [title, slug, subtitle, body, image_url, category, tags || [], is_published, featured, req.params.id]);
    res.json({ article: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM articles WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
