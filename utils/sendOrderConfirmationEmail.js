const path = require("path");
const transporter = require("./mailer");

module.exports = async function sendOrderConfirmationEmail(
  email,
  orderId,
  options = {},
) {
  const {
    title = "Gracias por tu compra",
    subtitle = "Tu pedido ha sido confirmado",
    message = "Estamos preparando tu orden y pronto recibirás novedades.",
    ctaText = "Ver mi pedido",
    ctaUrl = "https://100puntadas.vercel.app/",
  } = options;

  await transporter.sendMail({
    from: `"100Puntadas" <${process.env.MAIL_USER}>`,
    to: email,
    subject: `Pedido confirmado #${orderId}`,

    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- HEADER IMAGE -->
          <tr>
            <td>
              <img src="cid:header-image"
                   alt="100Puntadas"
                   width="600"
                   style="display:block;width:100%;height:auto;">
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:32px;color:#1a1a1a;">
              <h1 style="margin:0 0 10px;font-size:24px;font-weight:600;">
                ${title}
              </h1>

              <p style="margin:0 0 16px;font-size:16px;color:#555;">
                ${subtitle}
              </p>

              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#555;">
                ${message}
              </p>

              <p style="margin:0 0 24px;font-size:14px;color:#777;">
                Número de pedido: <strong>#${orderId}</strong>
              </p>

              <!-- CTA BUTTON -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#161616;border-radius:4px;">
                    <a href="${ctaUrl}"
                       style="display:inline-block;padding:12px 24px;
                              color:#ffffff;text-decoration:none;
                              font-size:14px;font-weight:600;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:20px;text-align:center;font-size:12px;color:#999;">
              © ${new Date().getFullYear()} 100Puntadas · Todos los derechos reservados
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,

    attachments: [
      {
        filename: "mail-img.png",
        path: path.join(__dirname, "../public/images/mail-img.png"),
        cid: "header-image", // 🔑 IMPORTANTE
      },
    ],
  });
};
