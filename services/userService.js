const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const HttpError = require("../utils/httpError");

/* ============================================================
   USUARIOS DEL PANEL (tabla users + user_profiles)
   Nunca se devuelve el hash de la contraseña fuera de este módulo.
============================================================ */
const ROLES = ["admin", "manager", "user"];
const PUBLIC_FIELDS = `
  u.id, u.username, u.full_name, u.email, u.role, u.active,
  u.created_at, u.last_login_at, up.profile_photo AS avatar`;

// Hash real para comparar cuando el usuario no existe (mismo tiempo de respuesta).
const DUMMY_HASH = bcrypt.hashSync("usuario-inexistente", 10);

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const normalizeEmail = (email) => {
  const value = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!value) return null;
  if (!/^\S+@\S+\.\S+$/.test(value)) throw new HttpError(400, "Correo inválido");
  return value;
};

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres");
  }
}

// Traduce choques de UNIQUE a un mensaje claro.
function uniqueError(err) {
  if (err.code !== "23505") return err;
  if (err.constraint === "users_username_key") return new HttpError(409, "Ese usuario ya existe");
  if (err.constraint === "users_email_key") return new HttpError(409, "Ese correo ya está en uso");
  return err;
}

/* Usuario de la sesión (lo usa requireAuth en cada petición). En la misma
   consulta trae los contadores del menú lateral: un viaje a la base de
   datos menos por página. */
async function findActiveById(id) {
  if (!Number.isInteger(Number(id))) return null;
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_FIELDS},
            (SELECT json_build_object(
                      'pending', count(*) FILTER (WHERE status = 'pending'),
                      'to_ship', count(*) FILTER (WHERE status = 'paid'))
             FROM orders) AS nav_counts
     FROM users u
     LEFT JOIN user_profiles up ON up.user_id = u.id
     WHERE u.id = $1 AND u.active`,
    [id],
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users u
     LEFT JOIN user_profiles up ON up.user_id = u.id
     WHERE u.id = $1`,
    [id],
  );
  if (!rows[0]) throw new HttpError(404, "Usuario no encontrado");
  return rows[0];
}

// Devuelve el usuario si usuario/contraseña son correctos (y está activo).
async function authenticate(username, password) {
  if (typeof username !== "string" || typeof password !== "string") return null;

  const { rows } = await pool.query(
    "SELECT id, role, password, active FROM users WHERE lower(username) = lower($1)",
    [username.trim()],
  );
  const user = rows[0];

  const ok = await bcrypt.compare(password, user?.password || DUMMY_HASH);
  if (!user || !ok || !user.active) return null;

  await pool.query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
  return { id: user.id, role: user.role };
}

async function list() {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users u
     LEFT JOIN user_profiles up ON up.user_id = u.id
     ORDER BY u.active DESC, u.role, u.full_name`,
  );
  return rows;
}

async function create({ username, full_name, email, role, password }) {
  if (!/^[a-z0-9._-]{3,30}$/i.test(username || "")) {
    throw new HttpError(400, "Usuario: 3 a 30 caracteres (letras, números, punto, guion)");
  }
  if (!full_name?.trim()) throw new HttpError(400, "El nombre es obligatorio");
  if (!ROLES.includes(role)) throw new HttpError(400, "Rol inválido");
  validatePassword(password);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (username, full_name, email, role, password)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [username.trim(), full_name.trim(), normalizeEmail(email), role, await bcrypt.hash(password, 10)],
    );
    return rows[0].id;
  } catch (err) {
    throw uniqueError(err);
  }
}

async function update(id, { full_name, email, role }) {
  if (!full_name?.trim()) throw new HttpError(400, "El nombre es obligatorio");
  if (role !== undefined && !ROLES.includes(role)) throw new HttpError(400, "Rol inválido");

  try {
    const { rowCount } = await pool.query(
      `UPDATE users SET full_name = $2, email = $3, role = COALESCE($4, role)
       WHERE id = $1`,
      [id, full_name.trim(), normalizeEmail(email), role ?? null],
    );
    if (!rowCount) throw new HttpError(404, "Usuario no encontrado");
  } catch (err) {
    throw uniqueError(err);
  }
}

async function setActive(id, active) {
  await pool.query("UPDATE users SET active = $2 WHERE id = $1", [id, active]);
}

async function setPassword(id, password) {
  validatePassword(password);
  await pool.query(
    `UPDATE users SET password = $2, reset_token = NULL, reset_token_expire = NULL
     WHERE id = $1`,
    [id, await bcrypt.hash(password, 10)],
  );
}

async function changeOwnPassword(id, currentPassword, newPassword) {
  const { rows } = await pool.query("SELECT password FROM users WHERE id = $1", [id]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword || "", rows[0].password))) {
    throw new HttpError(400, "La contraseña actual no es correcta");
  }
  await setPassword(id, newPassword);
}

async function setAvatar(userId, url) {
  await pool.query(
    `INSERT INTO user_profiles (user_id, profile_photo) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET profile_photo = EXCLUDED.profile_photo, updated_at = now()`,
    [userId, url],
  );
}

/* ---------- Recuperación de contraseña ----------
   En la DB se guarda solo el hash del token: quien lea la tabla
   no puede usarlo. Caduca en 1 hora. */
async function createResetToken(email) {
  const value = normalizeEmail(email);
  if (!value) return null;

  const { rows } = await pool.query(
    "SELECT id, full_name, email FROM users WHERE lower(email) = $1 AND active",
    [value],
  );
  const user = rows[0];
  if (!user) return null;

  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(
    `UPDATE users SET reset_token = $2, reset_token_expire = now() + interval '1 hour'
     WHERE id = $1`,
    [user.id, hashToken(token)],
  );
  return { user, token };
}

async function findByResetToken(token) {
  if (!/^[a-f0-9]{64}$/.test(token || "")) return null;
  const { rows } = await pool.query(
    `SELECT id FROM users
     WHERE reset_token = $1 AND reset_token_expire > now() AND active`,
    [hashToken(token)],
  );
  return rows[0] || null;
}

module.exports = {
  ROLES,
  findActiveById,
  findById,
  authenticate,
  list,
  create,
  update,
  setActive,
  setPassword,
  changeOwnPassword,
  setAvatar,
  createResetToken,
  findByResetToken,
};
