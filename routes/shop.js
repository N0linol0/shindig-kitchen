const express = require('express');
const { pool } = require('../db/pool');
const router = express.Router();

router.get('/products', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE is_active=true ORDER BY created_at DESC'
    );
    res.json({ products: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/products/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE slug=$1 AND is_active=true', [req.params.slug]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/orders', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const result = await pool.query(
      'SELECT o.*, json_agg(json_build_object(\'product\', p.name, \'qty\', oi.quantity, \'price\', oi.unit_price)) as items FROM orders o JOIN order_items oi ON o.id=oi.order_id JOIN products p ON oi.product_id=p.id WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC',
      [req.session.userId]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
