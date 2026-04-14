const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const { pool } = require('./db/pool');
const { initDB } = require('./db/init');

const menuRoutes = require('./routes/menu');
const homepageRoutes = require('./routes/homepage');
const contentstripRoutes = require('./routes/contentstrip');
const articleRoutes = require('./routes/articles');
const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes');
const commentRoutes = require('./routes/comments');
const shopRoutes = require('./routes/shop');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'shindig-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30
  }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/menu', menuRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/content-strip', contentstripRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/setup-admin', async (req, res) => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME, ADMIN_DISPLAY_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.send('Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables.');
  }
  try {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await pool.query(
      `INSERT INTO users (email, username, password, display_name, role)
       VALUES ($1, $2, $3, $4, 'admin')
       ON CONFLICT (email) DO UPDATE SET password=$3, role='admin'`,
      [ADMIN_EMAIL, ADMIN_USERNAME || 'admin', hash, ADMIN_DISPLAY_NAME || 'Admin']
    );
    res.send('Admin account ready. Delete ADMIN_PASSWORD from Railway env vars.');
  } catch (err) {
    res.send('Error: ' + err.message);
  }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/recipe/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Start only after DB is ready
initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Shindig Kitchen running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialise database:', err.message);
    process.exit(1);
  });

module.exports = app;
