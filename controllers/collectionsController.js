const collectionService = require("../services/collectionService");

exports.index = async (req, res) => {
  res.render("collections/index", {
    title: "Colecciones",
    collections: await collectionService.list(),
  });
};

exports.new = async (req, res) => {
  res.render("collections/form", {
    title: "Nueva colección",
    collection: { id: null, name: "", slug: "", active: true, products: [], available: await collectionService.allProducts() },
  });
};

exports.edit = async (req, res) => {
  const collection = await collectionService.getById(req.params.id);
  res.render("collections/form", { title: collection.name, collection });
};

exports.save = async (req, res) => {
  const id = await collectionService.save(req.params.id, req.body, req.user);
  res.flash("success", req.params.id ? "Colección actualizada" : "Colección creada");
  res.redirect(`/dashboard/collections/${id}/edit`);
};

exports.move = async (req, res) => {
  await collectionService.move(req.params.id, req.body.direction, req.user);
  res.redirect("/dashboard/collections");
};

exports.toggle = async (req, res) => {
  const active = req.body.active === "1";
  await collectionService.setActive(req.params.id, active, req.user);
  res.flash("success", active ? "Colección visible en la tienda" : "Colección oculta en la tienda");
  res.redirect(req.get("referer") || "/dashboard/collections");
};

exports.destroy = async (req, res) => {
  const { name } = await collectionService.remove(req.params.id, req.user);
  res.flash("success", `Colección "${name}" eliminada. Sus productos siguen en el catálogo.`);
  res.redirect("/dashboard/collections");
};
