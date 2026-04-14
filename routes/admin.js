const express = require('express');
const { pool } = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(requireAdmin);

router.get('/stats', async (req, res) => {
  try {
    const [recipes, users, orders, comments] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM recipes WHERE is_published=true'),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*), SUM(total) FROM orders'),
      pool.query('SELECT COUNT(*) FROM comments WHERE is_approved=false'),
    ]);
    res.json({
      recipes: parseInt(recipes.rows[0].count),
      users: parseInt(users.rows[0].count),
      orders: parseInt(orders.rows[0].count),
      revenue: parseFloat(orders.rows[0].sum || 0).toFixed(2),
      pending_comments: parseInt(comments.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/recipes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, c.name as category_name FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      ORDER BY r.created_at DESC
    `);
    res.json({ recipes: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/recipes', async (req, res) => {
  const { title, slug, description, category_id, prep_time, cook_time, base_servings, ingredients, steps, notes, tags, is_vegan, is_published, featured, image_url } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO recipes (title, slug, description, category_id, prep_time, cook_time, base_servings, ingredients, steps, notes, tags, is_vegan, is_published, featured, image_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *
    `, [title, slug, description, category_id, prep_time, cook_time, base_servings || 4, JSON.stringify(ingredients), JSON.stringify(steps), notes, tags, is_vegan || false, is_published || false, featured || false, image_url]);
    res.json({ recipe: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/recipes/:id', async (req, res) => {
  const { title, slug, description, category_id, prep_time, cook_time, base_servings, ingredients, steps, notes, tags, is_vegan, is_published, image_url } = req.body;
  try {
    const result = await pool.query(`
      UPDATE recipes SET title=$1, slug=$2, description=$3, category_id=$4, prep_time=$5, cook_time=$6,
      base_servings=$7, ingredients=$8, steps=$9, notes=$10, tags=$11, is_vegan=$12,
      is_published=$13, image_url=$14, updated_at=NOW()
      WHERE id=$15 RETURNING *
    `, [title, slug, description, category_id, prep_time, cook_time, base_servings, JSON.stringify(ingredients), JSON.stringify(steps), notes, tags, is_vegan, is_published, image_url, req.params.id]);
    res.json({ recipe: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/recipes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM recipes WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/orders', async (req, res) => {
  const { status } = req.query;
  try {
    let query = 'SELECT o.*, u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id=u.id';
    const params = [];
    if (status) { params.push(status); query += ` WHERE o.status=$1`; }
    query += ' ORDER BY o.created_at DESC';
    const result = await pool.query(query, params);
    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/orders/:id', async (req, res) => {
  const { status, tracking_number } = req.body;
  try {
    const result = await pool.query(
      'UPDATE orders SET status=$1, tracking_number=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [status, tracking_number, req.params.id]
    );
    res.json({ order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ products: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/products', async (req, res) => {
  const { name, slug, description, price, stock, image_url, recipe_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, slug, description, price, stock, image_url, recipe_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name, slug, description, price, stock || 0, image_url, recipe_id || null]
    );
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/products/:id', async (req, res) => {
  const { name, slug, description, price, stock, image_url, is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE products SET name=$1, slug=$2, description=$3, price=$4, stock=$5, image_url=$6, is_active=$7 WHERE id=$8 RETURNING *',
      [name, slug, description, price, stock, image_url, is_active, req.params.id]
    );
    res.json({ product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/comments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.username, r.title as recipe_title, r.slug as recipe_slug
      FROM comments c JOIN users u ON c.user_id=u.id JOIN recipes r ON c.recipe_id=r.id
      ORDER BY c.created_at DESC
    `);
    res.json({ comments: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/comments/:id', async (req, res) => {
  const { is_approved } = req.body;
  try {
    await pool.query('UPDATE comments SET is_approved=$1 WHERE id=$2', [is_approved, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/comments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM comments WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── USERS ──
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.username, u.display_name, u.role,
             u.is_suspended, u.created_at,
             COUNT(DISTINCT c.id) AS comment_count,
             COUNT(DISTINCT rl.recipe_id) AS likes_count
      FROM users u
      LEFT JOIN comments c ON c.user_id = u.id
      LEFT JOIN recipe_likes rl ON rl.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json({ users: result.rows });
  } catch (err) {
    console.error('admin GET /users:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  // Prevent demoting yourself
  if (parseInt(req.params.id) === req.session.userId && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot remove your own admin role' });
  }
  try {
    await pool.query('UPDATE users SET role=$1 WHERE id=$2', [role, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/suspend', async (req, res) => {
  const { is_suspended } = req.body;
  if (parseInt(req.params.id) === req.session.userId) {
    return res.status(400).json({ error: 'You cannot suspend yourself' });
  }
  try {
    await pool.query('UPDATE users SET is_suspended=$1 WHERE id=$2', [is_suspended, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/reset-password', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    // Generate a readable temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const tempPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const hash = await bcrypt.hash(tempPassword, 12);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, req.params.id]);
    res.json({ ok: true, tempPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  if (parseInt(req.params.id) === req.session.userId) {
    return res.status(400).json({ error: 'You cannot delete yourself' });
  }
  try {
    // Clean up related records first
    await pool.query('DELETE FROM recipe_likes WHERE user_id=$1', [req.params.id]);
    await pool.query('DELETE FROM saved_recipes WHERE user_id=$1', [req.params.id]);
    await pool.query('DELETE FROM comments WHERE user_id=$1', [req.params.id]);
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
