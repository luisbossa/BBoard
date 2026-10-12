const userService = require("../services/userService");
const activityService = require("../services/activityService");
const HttpError = require("../utils/httpError");

const notSelf = (req) => {
  if (Number(req.params.id) === req.user.id) {
    throw new HttpError(400, "No puedes cambiar tu propio rol o estado. Pide a otro administrador.");
  }
};

exports.index = async (req, res) => {
  res.render("users/index", { title: "Usuarios", users: await userService.list() });
};

exports.new = (req, res) => {
  res.render("users/form", {
    title: "Nuevo usuario",
    editUser: { id: null, username: "", full_name: "", email: "", role: "manager" },
    roles: userService.ROLES,
  });
};

exports.edit = async (req, res) => {
  res.render("users/form", {
    title: "Editar usuario",
    editUser: await userService.findById(req.params.id),
    roles: userService.ROLES,
  });
};

exports.create = async (req, res) => {
  const id = await userService.create(req.body);
  await activityService.log(req.user.id, "user_created", { userId: id, username: req.body.username });
  res.flash("success", "Usuario creado");
  res.redirect("/dashboard/users");
};

exports.update = async (req, res) => {
  const isSelf = Number(req.params.id) === req.user.id;
  // Uno mismo no puede quitarse el rol de admin (evita quedarse sin administradores).
  await userService.update(req.params.id, { ...req.body, role: isSelf ? undefined : req.body.role });

  if (req.body.password) await userService.setPassword(req.params.id, req.body.password);

  await activityService.log(req.user.id, "user_updated", { userId: Number(req.params.id) });
  res.flash("success", "Usuario actualizado");
  res.redirect("/dashboard/users");
};

exports.toggle = async (req, res) => {
  notSelf(req);
  const active = req.body.active === "1";
  await userService.setActive(req.params.id, active);
  await activityService.log(req.user.id, active ? "user_activated" : "user_deactivated", {
    userId: Number(req.params.id),
  });
  res.flash("success", active ? "Usuario activado" : "Usuario desactivado");
  res.redirect("/dashboard/users");
};
