const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  const { category, featured, limit = 12, offset = 0 } = req.query;
  try {
    let query = `
      SELECT r.*, c.name as category_name, c.slug as category_slug
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.is_published = true
    `;
    const params = [];
    if (category) { params.push(category); query += ` AND c.slug = $${params.length}`; }
    if (featured) { query += ` AND r.featured = true`; }
    params.push(limit); query += ` ORDER BY r.created_at DESC LIMIT $${params.length}`;
    params.push(offset); query += ` OFFSET $${params.length}`;
    const result = await pool.query(query, params);
    res.json({ recipes: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, c.name as category_name, c.slug as category_slug
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.slug = $1 AND r.is_published = true
    `, [req.params.slug]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Recipe not found' });
    const recipe = result.rows[0];
    if (req.session.userId) {
      const liked = await pool.query('SELECT 1 FROM recipe_likes WHERE user_id=$1 AND recipe_id=$2', [req.session.userId, recipe.id]);
      const saved = await pool.query('SELECT 1 FROM saved_recipes WHERE user_id=$1 AND recipe_id=$2', [req.session.userId, recipe.id]);
      recipe.user_liked = liked.rows.length > 0;
      recipe.user_saved = saved.rows.length > 0;
    }
    res.json({ recipe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/like', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;
  try {
    const existing = await pool.query('SELECT 1 FROM recipe_likes WHERE user_id=$1 AND recipe_id=$2', [userId, id]);
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM recipe_likes WHERE user_id=$1 AND recipe_id=$2', [userId, id]);
      await pool.query('UPDATE recipes SET like_count = like_count - 1 WHERE id=$1', [id]);
      res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO recipe_likes (user_id, recipe_id) VALUES ($1,$2)', [userId, id]);
      await pool.query('UPDATE recipes SET like_count = like_count + 1 WHERE id=$1', [id]);
      res.json({ liked: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/save', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;
  try {
    const existing = await pool.query('SELECT 1 FROM saved_recipes WHERE user_id=$1 AND recipe_id=$2', [userId, id]);
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM saved_recipes WHERE user_id=$1 AND recipe_id=$2', [userId, id]);
      res.json({ saved: false });
    } else {
      await pool.query('INSERT INTO saved_recipes (user_id, recipe_id) VALUES ($1,$2)', [userId, id]);
      res.json({ saved: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
