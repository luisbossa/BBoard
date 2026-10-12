const analyticsService = require("../services/analyticsService");

exports.index = async (req, res) => {
  const data = await analyticsService.getSummary(req.query.days);
  res.render("analytics", { title: "Analíticas", ...data });
};
