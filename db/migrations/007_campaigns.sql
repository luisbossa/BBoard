-- Campañas de descuento (p. ej. "Mes negro"): un % sobre el precio de los
-- productos durante un periodo. La tienda la aplica al leer el catálogo;
-- los precios base de los productos no se modifican.
CREATE TABLE IF NOT EXISTS campaigns (
  id serial PRIMARY KEY,
  name varchar(120) NOT NULL,
  percent integer NOT NULL CHECK (percent BETWEEN 1 AND 90),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,                       -- NULL = sin fecha de fin
  banner_text varchar(160),                  -- texto de la barra de promoción de la tienda
  skip_on_sale boolean NOT NULL DEFAULT true,      -- no tocar productos que ya están en oferta
  suspend_bundle_promo boolean NOT NULL DEFAULT true, -- sin "lleva 2 y ahorra" mientras dure
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS campaigns_period_idx ON campaigns (starts_at, ends_at) WHERE active;

CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
