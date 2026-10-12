const express = require("express");
const storeService = require("../services/storeService");

/* ============================================================
   /media/images/... → imagen de la tienda servida por el panel.
   Solo rutas /images/* con extensión de imagen (no es un proxy
   abierto). Caché larga: el CDN de Vercel y el navegador guardan
   la copia y la tienda no se consulta en cada vista.
============================================================ */
const router = express.Router();

router.get("/images/*path", async (req, res) => {
  const image = await storeService
    .fetchImage(`/images/${[].concat(req.params.path).join("/")}`)
    .catch(() => null);

  if (!image) return res.sendStatus(404);

  res.set({
    "Content-Type": image.type,
    "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
  });
  res.send(image.body);
});

module.exports = router;
