/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import nodemailer from "nodemailer";

let transporterCache = null;

function escHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("Variáveis SMTP_USER e SMTP_PASS não configuradas no .env.");
  }

  if (!transporterCache) {
    transporterCache = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return transporterCache;
}

export async function sendPasswordResetEmail({ to, name, code }) {
  const transporter = getTransporter();
  const primeiroNome = String(name || "").trim().split(/\s+/)[0] || "Tutor";

  const text = [
    `Olá, ${primeiroNome}!`,
    "",
    "Recebemos um pedido para redefinir a senha da sua conta no PetHealth.",
    `Seu código de verificação é: ${code}`,
    "",
    "Este código vale por 15 minutos.",
    "Se você não solicitou a redefinição de senha, basta ignorar este e-mail.",
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F4F6F8; padding: 24px; color: #2B3440;">
      <div style="max-width: 480px; margin: 0 auto; background: #FFFFFF; border: 1px solid #D9DFE5; border-top: 4px solid #FA7922; border-radius: 12px; padding: 24px;">
        <p style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #FA7922;">PetHealth</p>
        <h1 style="margin: 0 0 12px; font-size: 18px; color: #2B3440;">Recuperação de senha</h1>
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5;">
          Olá, ${escHtml(primeiroNome)}! Use o código abaixo para definir uma nova senha para sua conta:
        </p>
        <div style="margin: 20px 0; padding: 14px; text-align: center; background: #FFF6EF; border: 1px solid #FDD9C1; border-radius: 10px;">
          <span style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #2B3440;">${escHtml(code)}</span>
        </div>
        <p style="margin: 0 0 8px; font-size: 13px; color: #5F6B76;">
          Este código expira em <strong>15 minutos</strong> e pode ser usado apenas uma vez.
        </p>
        <p style="margin: 0; font-size: 13px; color: #5F6B76;">
          Se você não fez essa solicitação, pode ignorar este e-mail com segurança.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"PetHealth" <${process.env.SMTP_USER}>`,
    to,
    subject: "Código de recuperação de senha | PetHealth",
    text,
    html,
  });
}