const integrationService = require("../services/integrationService");

exports.integrations = async (req, res) => {
  const checks = await integrationService.runAll();
  res.render("settings/integrations", {
    title: "Estado de integraciones",
    checks,
    allOk: checks.every((c) => c.ok === true),
    checkedAt: new Date(),
  });
};
