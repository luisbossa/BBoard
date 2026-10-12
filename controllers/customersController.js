const customerService = require("../services/customerService");
const orderService = require("../services/orderService");

exports.index = async (req, res) => {
  const filters = { q: req.query.q || "", sort: req.query.sort || "recent", page: req.query.page };
  const { customers, pagination } = await customerService.list(filters);
  res.render("customers/index", { title: "Clientes", customers, pagination, filters });
};

exports.show = async (req, res) => {
  const email = req.params.email;
  const [customer, { orders }] = await Promise.all([
    customerService.getByEmail(email),
    orderService.list({ email, limit: 100 }),
  ]);
  res.render("customers/show", { title: customer.full_name, customer, orders });
};
