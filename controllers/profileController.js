const userService = require("../services/userService");
const blobService = require("../services/blobService");
const HttpError = require("../utils/httpError");

exports.show = (req, res) => {
  res.render("profile", { title: "Mi perfil" });
};

exports.update = async (req, res) => {
  await userService.update(req.user.id, { full_name: req.body.full_name, email: req.body.email });
  res.flash("success", "Perfil actualizado");
  res.redirect("/dashboard/profile");
};

exports.password = async (req, res) => {
  const { current_password, password, confirm } = req.body;
  if (password !== confirm) throw new HttpError(400, "Las contraseñas no coinciden");

  await userService.changeOwnPassword(req.user.id, current_password, password);
  res.flash("success", "Contraseña actualizada");
  res.redirect("/dashboard/profile");
};

exports.avatar = async (req, res) => {
  if (!req.file) throw new HttpError(400, "Selecciona una imagen");

  const url = await blobService.upload(req.file, `avatars/${req.user.id}`);
  const previous = req.user.avatar;
  await userService.setAvatar(req.user.id, url);
  await blobService.remove(previous);

  res.flash("success", "Foto actualizada");
  res.redirect("/dashboard/profile");
};
