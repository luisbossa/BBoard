const multer = require("multer");
const HttpError = require("../utils/httpError");

/* ============================================================
   SUBIDA DE IMÁGENES — en memoria (Vercel no tiene disco
   persistente); luego services/blobService las manda a Blob.
   4 MB por archivo: Vercel limita el body a 4.5 MB.
============================================================ */
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|avif)$/.test(file.mimetype)) return cb(null, true);
    cb(new HttpError(400, "Solo se permiten imágenes JPG, PNG, WEBP o AVIF."));
  },
});
