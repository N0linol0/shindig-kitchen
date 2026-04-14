const { pool } = require('./pool');

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           SERIAL PRIMARY KEY,
        email        VARCHAR(255) UNIQUE NOT NULL,
        username     VARCHAR(100) UNIQUE NOT NULL,
        password     VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        role         VARCHAR(20) DEFAULT 'user',
        created_at   TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id   SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id            SERIAL PRIMARY KEY,
        slug          VARCHAR(255) UNIQUE NOT NULL,
        title         VARCHAR(255) NOT NULL,
        description   TEXT,
        image_url     TEXT,
        prep_time     INTEGER,
        cook_time     INTEGER,
        base_servings INTEGER DEFAULT 4,
        ingredients   JSONB DEFAULT '[]',
        steps         JSONB DEFAULT '[]',
        notes         TEXT,
        category_id   INTEGER REFERENCES categories(id),
        is_vegan      BOOLEAN DEFAULT FALSE,
        is_published  BOOLEAN DEFAULT FALSE,
        featured      BOOLEAN DEFAULT FALSE,
        like_count    INTEGER DEFAULT 0,
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS recipe_likes (
        user_id   INTEGER REFERENCES users(id),
        recipe_id INTEGER REFERENCES recipes(id),
        PRIMARY KEY (user_id, recipe_id)
      );

      CREATE TABLE IF NOT EXISTS saved_recipes (
        user_id   INTEGER REFERENCES users(id),
        recipe_id INTEGER REFERENCES recipes(id),
        PRIMARY KEY (user_id, recipe_id)
      );

      CREATE TABLE IF NOT EXISTS comments (
        id          SERIAL PRIMARY KEY,
        recipe_id   INTEGER REFERENCES recipes(id),
        user_id     INTEGER REFERENCES users(id),
        body        TEXT NOT NULL,
        like_count  INTEGER DEFAULT 0,
        is_approved BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        description TEXT,
        price       NUMERIC(10,2) NOT NULL,
        image_url   TEXT,
        stock       INTEGER DEFAULT 0,
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER REFERENCES users(id),
        status     VARCHAR(50) DEFAULT 'pending',
        total      NUMERIC(10,2),
        email      VARCHAR(255),
        name       VARCHAR(255),
        address    TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id         SERIAL PRIMARY KEY,
        order_id   INTEGER REFERENCES orders(id),
        product_id INTEGER REFERENCES products(id),
        quantity   INTEGER,
        price      NUMERIC(10,2)
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id        SERIAL PRIMARY KEY,
        label     VARCHAR(100) NOT NULL,
        url       VARCHAR(255),
        page_type VARCHAR(50),
        position  INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS content_strip_items (
        id            SERIAL PRIMARY KEY,
        label         VARCHAR(100) NOT NULL,
        link_type     VARCHAR(30) DEFAULT 'category',
        url           VARCHAR(255),
        category_slug VARCHAR(100),
        position      INTEGER DEFAULT 99,
        is_active     BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS homepage_sections (
        id         SERIAL PRIMARY KEY,
        type       VARCHAR(50) NOT NULL,
        title      VARCHAR(255),
        position   INTEGER DEFAULT 99,
        is_active  BOOLEAN DEFAULT TRUE,
        config     JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS articles (
        id           SERIAL PRIMARY KEY,
        slug         VARCHAR(255) UNIQUE NOT NULL,
        title        VARCHAR(255) NOT NULL,
        subtitle     TEXT,
        body         TEXT,
        image_url    TEXT,
        category     VARCHAR(100),
        tags         TEXT[],
        is_published BOOLEAN DEFAULT FALSE,
        featured     BOOLEAN DEFAULT FALSE,
        author_id    INTEGER,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migrations — safe to run repeatedly
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE`);

    // Seed default content strip if empty
    const strip = await client.query('SELECT COUNT(*) FROM content_strip_items');
    if (parseInt(strip.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO content_strip_items (label, link_type, url, category_slug, position) VALUES
          ('All recipes',          'all',      '/',          '',         1),
          ('Canning & preserving', 'category', '/canning',   'canning',  2),
          ('Sauces & condiments',  'category', '/sauces',    'sauces',   3),
          ('Mains',                'category', '/mains',     'mains',    4),
          ('Baking',               'category', '/baking',    'baking',   5),
          ('Seasonal',             'category', '/seasonal',  'seasonal', 6),
          ('Pickles & ferments',   'category', '/pickles',   'pickles',  7),
          ('Desserts',             'category', '/desserts',  'desserts', 8)
      `);
    }

    // Seed default menu if empty
    const menu = await client.query('SELECT COUNT(*) FROM menu_items');
    if (parseInt(menu.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO menu_items (label, url, page_type, position) VALUES
          ('Recipes',  '/recipes',  'recipes',  1),
          ('Canning',  '/canning',  'category', 2),
          ('Seasonal', '/seasonal', 'category', 3),
          ('Shop',     '/shop',     'shop',     4)
      `);
    }

    console.log('Database initialised');
  } catch (err) {
    console.error('DB init error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { initDB };
