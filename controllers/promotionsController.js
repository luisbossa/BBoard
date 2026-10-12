const campaignService = require("../services/campaignService");

const EMPTY = {
  id: null,
  name: "",
  percent: 15,
  start_date: "",
  end_date: "",
  ends_at: true,
  banner_text: "",
  skip_on_sale: true,
  suspend_bundle_promo: true,
  active: true,
};

exports.index = async (req, res) => {
  res.render("promotions/index", { title: "Promociones", campaigns: await campaignService.list() });
};

exports.new = async (req, res) => {
  res.render("promotions/form", {
    title: "Nueva promoción",
    campaign: EMPTY,
    preview: await campaignService.preview(EMPTY),
  });
};

exports.edit = async (req, res) => {
  const campaign = await campaignService.getById(req.params.id);
  res.render("promotions/form", {
    title: campaign.name,
    campaign,
    preview: await campaignService.preview(campaign),
  });
};

exports.save = async (req, res) => {
  const id = await campaignService.save(req.params.id, req.body, req.user);
  res.flash("success", req.params.id ? "Promoción actualizada" : "Promoción creada");
  res.redirect(`/dashboard/promotions/${id}/edit`);
};

exports.toggle = async (req, res) => {
  const active = req.body.active === "1";
  await campaignService.setActive(req.params.id, active, req.user);
  res.flash("success", active ? "Promoción activada" : "Promoción desactivada: la tienda vuelve a los precios normales");
  res.redirect(req.get("referer") || "/dashboard/promotions");
};

exports.destroy = async (req, res) => {
  const { name } = await campaignService.remove(req.params.id, req.user);
  res.flash("success", `Promoción "${name}" eliminada`);
  res.redirect("/dashboard/promotions");
};
