const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/:recipeId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.recipe_id = $1 AND c.is_approved = true
      ORDER BY c.created_at DESC
    `, [req.params.recipeId]);
    res.json({ comments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:recipeId', requireAuth, async (req, res) => {
  const { body } = req.body;
  if (!body || body.trim().length === 0) {
    return res.status(400).json({ error: 'Comment cannot be empty' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO comments (recipe_id, user_id, body) VALUES ($1,$2,$3) RETURNING *',
      [req.params.recipeId, req.session.userId, body.trim()]
    );
    const comment = result.rows[0];
    const user = await pool.query('SELECT username, display_name, avatar_url FROM users WHERE id=$1', [req.session.userId]);
    res.json({ comment: { ...comment, ...user.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/like', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;
  try {
    const existing = await pool.query('SELECT 1 FROM comment_likes WHERE user_id=$1 AND comment_id=$2', [userId, id]);
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM comment_likes WHERE user_id=$1 AND comment_id=$2', [userId, id]);
      await pool.query('UPDATE comments SET like_count = like_count - 1 WHERE id=$1', [id]);
      res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO comment_likes (user_id, comment_id) VALUES ($1,$2)', [userId, id]);
      await pool.query('UPDATE comments SET like_count = like_count + 1 WHERE id=$1', [id]);
      res.json({ liked: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
