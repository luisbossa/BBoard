-- Inventario automático: lo mantiene la base de datos, así funciona igual
-- si el pago lo confirma ONVO (tienda), una aprobación SINPE o el panel.
--   → paid (desde pending/cancelled): descuenta las unidades vendidas.
--   paid → cancelled: las devuelve.
-- Solo afecta productos con stock controlado (stock NULL = bajo pedido).

CREATE OR REPLACE FUNCTION orders_adjust_stock() RETURNS trigger AS $$
DECLARE
  direction integer;
BEGIN
  IF NEW.status = 'paid' AND OLD.status IN ('pending', 'cancelled') THEN
    direction := -1;
  ELSIF NEW.status = 'cancelled' AND OLD.status = 'paid' THEN
    direction := 1;
  ELSE
    RETURN NEW;
  END IF;

  UPDATE products p
  SET stock = GREATEST(p.stock + direction * i.quantity, 0)
  FROM (
    SELECT product_id, SUM(quantity) AS quantity
    FROM order_items
    WHERE order_id = NEW.id AND product_id IS NOT NULL
    GROUP BY product_id
  ) i
  WHERE p.id = i.product_id AND p.stock IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_adjust_stock
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION orders_adjust_stock();
