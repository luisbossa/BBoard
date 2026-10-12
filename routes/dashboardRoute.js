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

router.get("/", dashboard.index);
router.get("/notifications", dashboard.notifications);
router.get("/api/notifications", dashboard.notificationsApi);

// Pedidos
router.get("/orders", orders.index);
router.get("/orders/:id", orders.show);
router.post("/orders/:id/status", canEdit, orders.updateStatus);
router.post("/orders/:id/notes", canEdit, orders.updateNotes);

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

// Perfil propio
router.get("/profile", profile.show);
router.post("/profile", profile.update);
router.post("/profile/password", profile.password);
router.post("/profile/avatar", upload.single("avatar"), profile.avatar);

module.exports = router;
