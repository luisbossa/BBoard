const crypto = require("crypto");
const path = require("path");
const { put, del } = require("@vercel/blob");
const env = require("../config/env");
const HttpError = require("../utils/httpError");

/* ============================================================
   VERCEL BLOB — imágenes subidas desde el panel.
   Devuelve URLs públicas que usan el panel y la tienda.
============================================================ */
const BLOB_HOST = /\.public\.blob\.vercel-storage\.com\//;

async function upload(file, folder) {
  if (!env.blobToken) {
    throw new HttpError(
      503,
      "No se pueden subir imágenes: falta configurar Vercel Blob (BLOB_READ_WRITE_TOKEN). Revisa Integraciones.",
    );
  }

  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const name = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;

  const blob = await put(name, file.buffer, {
    access: "public",
    contentType: file.mimetype,
    token: env.blobToken,
  });
  return blob.url;
}

// Solo borra archivos de Blob (las rutas /images/... son de la tienda).
async function remove(url) {
  if (!env.blobToken || !BLOB_HOST.test(url || "")) return;
  try {
    await del(url, { token: env.blobToken });
  } catch (err) {
    console.error("BLOB DELETE ERROR:", err.message);
  }
}

module.exports = { upload, remove };
