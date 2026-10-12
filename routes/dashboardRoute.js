const express = require("express");
const upload = require("../middlewares/upload");
const { requireAuth, requireRole, canEdit } = require("../middlewares/auth");

const dashboard = require("../controllers/dashboardController");
const orders = require("../controllers/ordersController");
const customers = require("../controllers/customersController");
const products = require("../controllers/productsController");
const analytics = require("../controllers/analyticsController");
const users = require("../controllers/usersController");
const profile = require("../controllers/profileController");

/* ============================================================
   /dashboard — todo requiere sesión.
   Lectura: cualquier rol. Escritura: admin y manager (canEdit).
   Usuarios del panel: solo admin.
============================================================ */
const router = express.Router();
router.use(requireAuth);

// Contadores del menú lateral
// (vienen en la misma consulta del usuario de la sesión: ver userService.findActiveById)
router.use((req, res, next) => {
  res.locals.navCounts = req.user.nav_counts;
  next();
});

router.get("/", dashboard.index);
router.get("/notifications", dashboard.notifications);
router.get("/api/notifications", dashboard.notificationsApi);

// Pedidos
router.get("/orders", orders.index);
router.get("/orders/:id", orders.show);
router.post("/orders/:id/status", canEdit, orders.updateStatus);
router.post("/orders/:id/notes", canEdit, orders.updateNotes);
router.post("/orders/:id/verify-onvo", canEdit, orders.verifyOnvo);

// Clientes
router.get("/customers", customers.index);
router.get("/customers/:email", customers.show);

// Productos
router.get("/products", products.index);
router.get("/products/new", canEdit, products.new);
router.post("/products", canEdit, upload.array("new_images", 10), products.save);
router.get("/products/:id/edit", products.edit);
router.post("/products/:id", canEdit, upload.array("new_images", 10), products.save);
router.post("/products/:id/toggle", canEdit, products.toggle);
router.post("/products/:id/delete", canEdit, products.destroy);

// Colecciones (secciones de la home de la tienda)
const collections = require("../controllers/collectionsController");
router.get("/collections", collections.index);
router.get("/collections/new", canEdit, collections.new);
router.post("/collections", canEdit, collections.save);
router.get("/collections/:id/edit", collections.edit);
router.post("/collections/:id", canEdit, collections.save);
router.post("/collections/:id/move", canEdit, collections.move);
router.post("/collections/:id/toggle", canEdit, collections.toggle);
router.post("/collections/:id/delete", canEdit, collections.destroy);

// Promociones (campañas de descuento de la tienda)
const promotions = require("../controllers/promotionsController");
router.get("/promotions", promotions.index);
router.get("/promotions/new", canEdit, promotions.new);
router.post("/promotions", canEdit, promotions.save);
router.get("/promotions/:id/edit", promotions.edit);
router.post("/promotions/:id", canEdit, promotions.save);
router.post("/promotions/:id/toggle", canEdit, promotions.toggle);
router.post("/promotions/:id/delete", canEdit, promotions.destroy);

// Analíticas
router.get("/analytics", analytics.index);

// Usuarios del panel
const adminOnly = requireRole("admin");
router.get("/users", adminOnly, users.index);
router.get("/users/new", adminOnly, users.new);
router.post("/users", adminOnly, users.create);
router.get("/users/:id/edit", adminOnly, users.edit);
router.post("/users/:id", adminOnly, users.update);
router.post("/users/:id/toggle", adminOnly, users.toggle);

// Estado de integraciones (tienda, ONVO, correo, cron)
router.get("/settings/integrations", adminOnly, require("../controllers/settingsController").integrations);

// Perfil propio
router.get("/profile", profile.show);
router.post("/profile", profile.update);
router.post("/profile/password", profile.password);
router.post("/profile/avatar", upload.single("avatar"), profile.avatar);

module.exports = router;
