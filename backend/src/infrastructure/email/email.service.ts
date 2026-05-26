import { env } from "../../config/env.js";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Email service using Resend API.
 * Falls back to console.log if RESEND_API_KEY is not configured.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(`[EMAIL] Would send email to ${to}: ${subject}`);
    console.log(`[EMAIL] Body: ${html.substring(0, 200)}...`);
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ClickSend <noreply@clicksend.app>",
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[EMAIL] Failed to send email: ${errorData}`);
    }
  } catch (err: any) {
    console.error(`[EMAIL] Error sending email: ${err.message}`);
  }
}

/**
 * Send password reset code email
 */
export async function sendPasswordResetCode(email: string, code: string): Promise<void> {
  const appUrl = env.APP_URL;
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 48px; height: 48px; background: #059669; border-radius: 12px; line-height: 48px; text-align: center; color: white; font-size: 24px; font-weight: bold;">C</div>
      </div>
      <h1 style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center; margin: 0 0 8px 0;">
        Restablece tu contraseña
      </h1>
      <p style="font-size: 14px; color: #64748b; text-align: center; margin: 0 0 24px 0;">
        Usa el siguiente código para restablecer tu contraseña en ClickSend
      </p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; margin: 0 0 8px 0;">
          Código de verificación
        </p>
        <p style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 36px; font-weight: 800; color: #059669; letter-spacing: 8px; margin: 0;">
          ${code}
        </p>
        <p style="font-size: 12px; color: #94a3b8; margin: 12px 0 0 0;">
          Este código expira en 15 minutos
        </p>
      </div>
      <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0;">
        Si no solicitaste restablecer tu contraseña, ignora este correo.
      </p>
      <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; text-align: center;">
        <p style="font-size: 12px; color: #cbd5e1; margin: 0;">
          ClickSend &mdash; WhatsApp Marketing Platform
        </p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: "Restablece tu contraseña - ClickSend",
    html,
  });
}
