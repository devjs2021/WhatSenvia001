import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  if (!env.RESEND_API_KEY) {
    logger.warn({ to, subject }, 'RESEND_API_KEY not configured, skipping email');
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
      logger.error({ to, subject, error: errorData }, 'Failed to send email');
    }
  } catch (err: any) {
    logger.error({ to, error: err.message }, 'Error sending email');
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

function emailWrapper(title: string, body: string): string {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 48px; height: 48px; background: #059669; border-radius: 12px; line-height: 48px; text-align: center; color: white; font-size: 24px; font-weight: bold;">C</div>
      </div>
      <h1 style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center; margin: 0 0 8px 0;">${title}</h1>
      ${body}
      <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; text-align: center;">
        <p style="font-size: 12px; color: #cbd5e1; margin: 0;">ClickSend &mdash; WhatsApp Marketing Platform</p>
      </div>
    </div>
  `;
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const appUrl = env.APP_URL;
  const html = emailWrapper("Bienvenido a ClickSend", `
    <p style="font-size: 14px; color: #64748b; text-align: center; margin: 0 0 24px 0;">
      Hola <strong style="color: #0f172a;">${name}</strong>, tu cuenta ha sido creada exitosamente.
    </p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="font-size: 13px; color: #166534; margin: 0 0 12px 0; font-weight: 600;">Tu cuenta incluye:</p>
      <ul style="font-size: 13px; color: #166534; margin: 0; padding-left: 20px;">
        <li>7 dias de prueba gratis</li>
        <li>Hasta 50 contactos</li>
        <li>Campanas masivas por WhatsApp</li>
        <li>Bot Builder con IA</li>
        <li>Chat en Vivo</li>
      </ul>
    </div>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${appUrl}/dashboard" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 600;">Ir al Dashboard</a>
    </div>
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
      Conecta tu WhatsApp para empezar a enviar mensajes.
    </p>
  `);

  await sendEmail({ to: email, subject: "Bienvenido a ClickSend", html });
}

export async function sendCampaignCompletedEmail(
  email: string,
  name: string,
  campaignName: string,
  stats: { sent: number; failed: number; total: number }
): Promise<void> {
  const appUrl = env.APP_URL;
  const successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;
  const html = emailWrapper("Campana Finalizada", `
    <p style="font-size: 14px; color: #64748b; text-align: center; margin: 0 0 24px 0;">
      Hola ${name}, tu campana ha terminado.
    </p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; text-align: center;">
        ${campaignName}
      </p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="text-align: center; padding: 8px;">
            <p style="font-size: 28px; font-weight: 800; color: #059669; margin: 0;">${stats.sent}</p>
            <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 4px 0 0 0;">Enviados</p>
          </td>
          <td style="text-align: center; padding: 8px;">
            <p style="font-size: 28px; font-weight: 800; color: #ef4444; margin: 0;">${stats.failed}</p>
            <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 4px 0 0 0;">Fallidos</p>
          </td>
          <td style="text-align: center; padding: 8px;">
            <p style="font-size: 28px; font-weight: 800; color: #3b82f6; margin: 0;">${successRate}%</p>
            <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 4px 0 0 0;">Exito</p>
          </td>
        </tr>
      </table>
    </div>
    <div style="text-align: center;">
      <a href="${appUrl}/campaigns" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 600;">Ver Detalles</a>
    </div>
  `);

  await sendEmail({ to: email, subject: `Campana "${campaignName}" finalizada - ${stats.sent} enviados`, html });
}

export async function sendTemplateStatusEmail(
  email: string,
  name: string,
  templateName: string,
  status: "APPROVED" | "REJECTED",
  reason?: string
): Promise<void> {
  const appUrl = env.APP_URL;
  const isApproved = status === "APPROVED";
  const html = emailWrapper(
    isApproved ? "Template Aprobado" : "Template Rechazado",
    `
    <p style="font-size: 14px; color: #64748b; text-align: center; margin: 0 0 24px 0;">
      Hola ${name}, tu template de Meta ha sido ${isApproved ? "aprobado" : "rechazado"}.
    </p>
    <div style="background: ${isApproved ? "#f0fdf4" : "#fef2f2"}; border: 1px solid ${isApproved ? "#bbf7d0" : "#fecaca"}; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <p style="font-size: 36px; margin: 0 0 8px 0;">${isApproved ? "✅" : "❌"}</p>
      <p style="font-size: 16px; font-weight: 700; color: ${isApproved ? "#166534" : "#991b1b"}; margin: 0;">
        ${templateName}
      </p>
      ${reason ? `<p style="font-size: 13px; color: #991b1b; margin: 8px 0 0 0;">${reason}</p>` : ""}
    </div>
    <div style="text-align: center;">
      <a href="${appUrl}/campaigns" style="display: inline-block; background: ${isApproved ? "#059669" : "#64748b"}; color: white; text-decoration: none; padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 600;">
        ${isApproved ? "Enviar Campana" : "Ver Detalles"}
      </a>
    </div>
  `);

  await sendEmail({ to: email, subject: `Template "${templateName}" ${isApproved ? "aprobado ✅" : "rechazado ❌"}`, html });
}

export async function sendLicenseExpiringEmail(
  email: string,
  name: string,
  plan: string,
  expiresAt: Date
): Promise<void> {
  const appUrl = env.APP_URL;
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const html = emailWrapper("Tu Plan Esta por Vencer", `
    <p style="font-size: 14px; color: #64748b; text-align: center; margin: 0 0 24px 0;">
      Hola ${name}, tu plan esta por expirar.
    </p>
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <p style="font-size: 36px; margin: 0 0 8px 0;">⏳</p>
      <p style="font-size: 16px; font-weight: 700; color: #92400e; margin: 0;">
        Plan ${plan.toUpperCase()} — ${daysLeft} dias restantes
      </p>
      <p style="font-size: 13px; color: #b45309; margin: 8px 0 0 0;">
        Vence el ${expiresAt.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
    <p style="font-size: 13px; color: #64748b; text-align: center; margin: 0 0 16px 0;">
      Renueva tu plan para no perder acceso a tus campanas, contactos y conversaciones.
    </p>
    <div style="text-align: center;">
      <a href="${appUrl}/settings" style="display: inline-block; background: #f59e0b; color: white; text-decoration: none; padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 600;">Renovar Plan</a>
    </div>
  `);

  await sendEmail({ to: email, subject: `Tu plan ${plan} vence en ${daysLeft} dias`, html });
}
