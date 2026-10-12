const express = require("express");
const storeService = require("../services/storeService");

/* ============================================================
   /media/images/...[?w=160|400] → imagen de la tienda servida por el panel.
   Solo rutas /images/* con extensión de imagen (no es un proxy abierto).
   Con ?w= se sirve la versión WebP reducida que genera la tienda
   (public/images/opt/<ruta>-<ancho>.webp) y, si no existe, la original.
   Caché larga: el CDN de Vercel y el navegador guardan la copia.
============================================================ */
const router = express.Router();
const WIDTHS = [160, 400];

// /images/swimwears/a.webp + 160 → /images/opt/swimwears/a-160.webp
const variantPath = (path, width) =>
  `/images/opt${path.slice("/images".length).replace(/\.\w+$/, "")}-${width}.webp`;

router.get("/images/*path", async (req, res) => {
  const path = `/images/${[].concat(req.params.path).join("/")}`;
  const width = Number(req.query.w);

  let image = null;
  if (WIDTHS.includes(width)) {
    image = await storeService.fetchImage(variantPath(path, width)).catch(() => null);
  }
  image ??= await storeService.fetchImage(path).catch(() => null);

  if (!image) return res.sendStatus(404);

  res.set({
    "Content-Type": image.type,
    "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
  });
  res.send(image.body);
});

module.exports = router;
