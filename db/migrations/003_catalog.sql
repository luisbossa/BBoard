-- Catálogo en la base de datos (antes vivía en data/catalog.js de la tienda).

-- stock NULL = bajo pedido (sin control de inventario), 0 = agotado.
ALTER TABLE products ALTER COLUMN stock DROP NOT NULL;
ALTER TABLE products ALTER COLUMN stock DROP DEFAULT;

ALTER TABLE products
  ADD CONSTRAINT products_stock_check CHECK (stock IS NULL OR stock >= 0),
  ADD CONSTRAINT products_price_check CHECK (price >= 0 AND (old_price IS NULL OR old_price >= 0)),
  ADD CONSTRAINT products_type_check CHECK (product_type IN ('bikini', 'one-piece', 'crochet', 'set'));

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE product_sizes ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 1;
ALTER TABLE product_styles ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS product_images_product_idx ON product_images (product_id, position);
CREATE INDEX IF NOT EXISTS product_styles_product_idx ON product_styles (product_id, position);

-- Colecciones de la home (Bikinis, Enterizos, Tejidos, Sets).
CREATE TABLE IF NOT EXISTS collections (
  id serial PRIMARY KEY,
  slug varchar(60) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  position integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_products (
  collection_id integer NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1,
  PRIMARY KEY (collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS collection_products_product_idx ON collection_products (product_id);

-- Relación pedido → producto (opcional: los ítems conservan nombre/precio históricos).
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_id integer REFERENCES products (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items (product_id);
