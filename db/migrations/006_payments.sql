-- Pagos con tarjeta: el id del PaymentIntent de ONVO permite consultar
-- su estado desde la tienda (página de confirmación) y desde el panel.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id varchar(64);

CREATE INDEX IF NOT EXISTS orders_payment_intent_idx
  ON orders (payment_intent_id) WHERE payment_intent_id IS NOT NULL;

-- Acciones del sistema (webhook de ONVO, cancelación automática): user_id NULL.
ALTER TABLE user_activity ALTER COLUMN user_id DROP NOT NULL;
