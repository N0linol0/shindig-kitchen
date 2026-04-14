-- Shindig Kitchen database schema

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  username    VARCHAR(100) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  display_name VARCHAR(150),
  avatar_url  TEXT,
  role        VARCHAR(20) DEFAULT 'user',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  slug  VARCHAR(100) UNIQUE NOT NULL
);

INSERT INTO categories (name, slug) VALUES
  ('Canning & Preserving', 'canning'),
  ('Sauces & Condiments', 'sauces'),
  ('Mains', 'mains'),
  ('Baking', 'baking'),
  ('Seasonal', 'seasonal'),
  ('Pickles & Ferments', 'pickles'),
  ('Desserts', 'desserts')
ON CONFLICT DO NOTHING;

-- RECIPES
CREATE TABLE IF NOT EXISTS recipes (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(255) UNIQUE NOT NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  category_id   INTEGER REFERENCES categories(id),
  image_url     TEXT,
  prep_time     INTEGER,
  cook_time     INTEGER,
  base_servings INTEGER DEFAULT 4,
  ingredients   JSONB NOT NULL DEFAULT '[]',
  steps         JSONB NOT NULL DEFAULT '[]',
  notes         TEXT,
  tags          TEXT[],
  is_vegan      BOOLEAN DEFAULT FALSE,
  is_published  BOOLEAN DEFAULT FALSE,
  featured      BOOLEAN DEFAULT FALSE,
  like_count    INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- RECIPE LIKES
CREATE TABLE IF NOT EXISTS recipe_likes (
  user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, recipe_id)
);

-- SAVED RECIPES
CREATE TABLE IF NOT EXISTS saved_recipes (
  user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, recipe_id)
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL PRIMARY KEY,
  recipe_id   INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  like_count  INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- COMMENT LIKES
CREATE TABLE IF NOT EXISTS comment_likes (
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, comment_id)
);

-- SHOP PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL,
  image_url   TEXT,
  stock       INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  recipe_id   INTEGER REFERENCES recipes(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  email           VARCHAR(255) NOT NULL,
  status          VARCHAR(50) DEFAULT 'pending',
  total           NUMERIC(10,2) NOT NULL,
  shipping_name   VARCHAR(255),
  shipping_address TEXT,
  shipping_city   VARCHAR(100),
  shipping_state  VARCHAR(50),
  shipping_zip    VARCHAR(20),
  shipping_country VARCHAR(50) DEFAULT 'US',
  tracking_number VARCHAR(255),
  stripe_session_id VARCHAR(255),
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity   INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category_id);
CREATE INDEX IF NOT EXISTS idx_recipes_featured ON recipes(featured);
CREATE INDEX IF NOT EXISTS idx_comments_recipe ON comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id          SERIAL PRIMARY KEY,
  label       VARCHAR(100) NOT NULL,
  url         VARCHAR(255),
  page_type   VARCHAR(50),
  position    INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  parent_id   INTEGER REFERENCES menu_items(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

INSERT INTO menu_items (label, url, page_type, position) VALUES
  ('Recipes', '/recipes', 'recipes', 1),
  ('Canning', '/canning', 'category', 2),
  ('Seasonal', '/seasonal', 'category', 3),
  ('Shop', '/shop', 'shop', 4)
ON CONFLICT DO NOTHING;

-- HOMEPAGE SECTIONS
CREATE TABLE IF NOT EXISTS homepage_sections (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(255),
  position    INTEGER DEFAULT 99,
  is_active   BOOLEAN DEFAULT TRUE,
  config      JSONB DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- Default sections
INSERT INTO homepage_sections (type, title, position, is_active, config) VALUES
  ('hero', 'Featured this week', 1, true, '{"recipe_id": null, "tag": "✦ Featured this week"}'),
  ('recipes', 'Recent recipes', 2, true, '{"recipe_ids": [], "sort": "newest", "limit": 6}'),
  ('shop_teaser', 'From our kitchen', 3, true, '{"description": "A curated selection of small-batch jams, pickles, and condiments made from the same recipes on this site.", "product_ids": []}'),
  ('spotlight', 'Canning school', 4, true, '{"description": "From water bath basics to pressure canning, we''ve got you covered — step by step, jar by jar.", "tiles": [{"emoji": "🫙", "name": "Water Bath Canning", "count": "12 recipes", "url": "/canning"}, {"emoji": "🧄", "name": "Pickles & Brines", "count": "18 recipes", "url": "/pickles"}, {"emoji": "🍓", "name": "Jams & Jellies", "count": "24 recipes", "url": "/canning"}, {"emoji": "🌶️", "name": "Ferments & Hot Sauces", "count": "9 recipes", "url": "/pickles"}]}')
ON CONFLICT DO NOTHING;

-- CONTENT STRIP (sub-navigation)
CREATE TABLE IF NOT EXISTS content_strip_items (
  id          SERIAL PRIMARY KEY,
  label       VARCHAR(100) NOT NULL,
  link_type   VARCHAR(30) DEFAULT 'category',
  url         VARCHAR(255),
  category_slug VARCHAR(100),
  position    INTEGER DEFAULT 99,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

INSERT INTO content_strip_items (label, link_type, url, category_slug, position) VALUES
  ('All recipes',          'all',      '/',             '',         1),
  ('Canning & preserving', 'category', '/canning',      'canning',  2),
  ('Sauces & condiments',  'category', '/sauces',       'sauces',   3),
  ('Mains',                'category', '/mains',        'mains',    4),
  ('Baking',               'category', '/baking',       'baking',   5),
  ('Seasonal',             'category', '/seasonal',     'seasonal', 6),
  ('Pickles & ferments',   'category', '/pickles',      'pickles',  7),
  ('Desserts',             'category', '/desserts',     'desserts', 8)
ON CONFLICT DO NOTHING;

-- ARTICLES
CREATE TABLE IF NOT EXISTS articles (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(255) UNIQUE NOT NULL,
  title         VARCHAR(255) NOT NULL,
  subtitle      TEXT,
  body          TEXT,
  image_url     TEXT,
  category      VARCHAR(100),
  tags          TEXT[],
  is_published  BOOLEAN DEFAULT FALSE,
  featured      BOOLEAN DEFAULT FALSE,
  author_id     INTEGER REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published);
