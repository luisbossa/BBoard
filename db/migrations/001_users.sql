-- Usuarios del panel: correo para recuperar contraseña, activación y último acceso.
-- Roles: admin (todo), manager (opera la tienda), user (solo lectura).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email varchar(255),
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key
  ON users (lower(email)) WHERE email IS NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'user'));

-- updated_at automático (se reutiliza en products).
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
