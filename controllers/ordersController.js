const orderService = require("../services/orderService");
const fmt = require("../utils/format");

exports.index = async (req, res) => {
  const filters = {
    status: req.query.status || "",
    method: req.query.method || "",
    q: req.query.q || "",
    from: req.query.from || "",
    to: req.query.to || "",
    page: req.query.page,
  };
  const { orders, pagination } = await orderService.list(filters);

  res.render("orders/index", { title: "Pedidos", orders, pagination, filters });
};

exports.show = async (req, res) => {
  const order = await orderService.getById(req.params.id);
  res.render("orders/show", { title: `Pedido #${order.orderNumber ?? order.id}`, order });
};

// Responde JSON (botones con fetch) o redirige (formularios).
exports.updateStatus = async (req, res) => {
  const result = await orderService.updateStatus(req.params.id, req.body.status, req.user, {
    trackingNumber: req.body.tracking_number,
  });

  let message = `Pedido marcado como ${fmt.status(result.to).toLowerCase()}`;
  if (result.customerNotified === false) {
    message += ". Atención: no se pudo avisar a la tienda para enviar el correo al cliente.";
  }

  if (req.is("application/json")) return res.json({ ok: true, ...result, message });

  res.flash(result.customerNotified === false ? "warning" : "success", message);
  res.redirect(req.get("referer") || `/dashboard/orders/${req.params.id}`);
};

exports.updateNotes = async (req, res) => {
  await orderService.updateNotes(
    req.params.id,
    { adminNotes: req.body.admin_notes, trackingNumber: req.body.tracking_number },
    req.user,
  );
  res.flash("success", "Notas guardadas");
  res.redirect(`/dashboard/orders/${req.params.id}`);
};
