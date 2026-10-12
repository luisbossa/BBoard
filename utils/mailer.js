const nodemailer = require("nodemailer");
const env = require("../config/env");

/* ============================================================
   CORREO (Gmail con contraseña de aplicación)
   El transporte se crea al primer envío: en Vercel no conviene
   abrir conexiones SMTP al importar el módulo.
============================================================ */
let transporter;

function getTransporter() {
  if (!env.mail.user || !env.mail.pass) {
    throw new Error("Faltan MAIL_USER / MAIL_PASS para enviar correos");
  }
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.mail.user, pass: env.mail.pass },
  });
  return transporter;
}

exports.send = ({ to, subject, html }) =>
  getTransporter().sendMail({
    from: `"100Puntadas · Panel" <${env.mail.user}>`,
    to,
    subject,
    html,
  });
