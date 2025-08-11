const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false, // true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, html, text }) {
  const msg = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  };
  return transporter.sendMail(msg);
}

module.exports = { sendEmail };
