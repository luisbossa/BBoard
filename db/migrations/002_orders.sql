-- Ciclo de vida del pedido: pending → paid → shipped → delivered (o cancelled).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_number varchar(100),
  ADD COLUMN IF NOT EXISTS admin_notes text;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IS NULL OR payment_method IN ('sinpe', 'card'));

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key
  ON orders (order_number) WHERE order_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (lower(email));
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS user_activity_created_at_idx ON user_activity (created_at DESC);
