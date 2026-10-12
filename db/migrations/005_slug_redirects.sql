-- URLs antiguas de productos → producto actual (redirección 301 en la tienda).
-- El panel agrega una fila cada vez que se cambia el slug de un producto.
CREATE TABLE IF NOT EXISTS product_slug_redirects (
  old_slug varchar(60) PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_slug_redirects_product_idx ON product_slug_redirects (product_id);

-- Claves de URL de data/catalog.js que no coincidían con el id del producto.
INSERT INTO product_slug_redirects (old_slug, product_id)
SELECT v.old_slug, p.id
FROM (VALUES
  ('fairyFloss', 'fairy-floss'),
  ('wildRaspberry', 'wild-raspberry'),
  ('redWine', 'red-wine'),
  ('snakePrint', 'snake-print'),
  ('heartOfOcean', 'heart-of-ocean'),
  ('bubblegum', 'bubble-gum-kiini'),
  ('vintageSummer', 'vintage-summer'),
  ('navyBlue', 'navy-blue'),
  ('redMosaic', 'red-mosaic'),
  ('onePiece', 'one-piece'),
  ('daisyBikini', 'daisy-bikini'),
  ('scarlettBikini', 'scarlett-bikini'),
  ('sorbetLime', 'sorbet-lime'),
  ('sorbetPink', 'sorbet-pink'),
  ('sorbetBubblegum', 'sorbet-bubblegum'),
  ('bdayCake', 'bday-cake'),
  ('rose', 'rose-set'),
  ('catalina', 'catalina-set'),
  ('islaBlanca', 'isla-blanca'),
  ('selena', 'selena-set')
) AS v(old_slug, slug)
JOIN products p ON p.slug = v.slug
ON CONFLICT (old_slug) DO NOTHING;
