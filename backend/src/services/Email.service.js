const nodemailer = require("nodemailer");
const logger = require("../config/logger");

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (String(process.env.EMAIL_ENABLED) !== "true") return null;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: String(process.env.EMAIL_SECURE) === "true",
    auth: process.env.EMAIL_USER ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } : undefined,
  });
  return transporter;
}

async function send(to, subject, html, text) {
  const mailer = getTransporter();
  if (!mailer) {
    logger.info("Email disabled; skipping email", { to, subject });
    return { skipped: true };
  }
  return mailer.sendMail({
    from: process.env.EMAIL_FROM,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    to,
    subject,
    html,
    text,
  });
}

async function sendApplicationConfirmation(email, payload) {
  return send(
    email,
    "Application received",
    `<h2>Application received</h2><p>Hello ${payload.name}, your application ID is <strong>${payload.applicationId}</strong>.</p>`,
    `Hello ${payload.name}, your application ID is ${payload.applicationId}.`
  );
}

async function sendApplicationDecision(email, payload) {
  const subject = payload.approved ? "Application approved" : "Application rejected";
  const html = payload.approved
    ? `<h2>Application approved</h2><p>Your certificate is now available.</p>`
    : `<h2>Application rejected</h2><p>${payload.reason || "Please contact support for more information."}</p>`;
  return send(email, subject, html, html.replace(/<[^>]+>/g, ""));
}

module.exports = { send, sendApplicationConfirmation, sendApplicationDecision };
