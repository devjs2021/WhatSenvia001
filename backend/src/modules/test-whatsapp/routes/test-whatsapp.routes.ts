import { FastifyInstance } from "fastify";
import { env } from "../../../config/env.js";

export async function testWhatsappRoutes(app: FastifyInstance) {
  app.post<{ Body: { to: string } }>("/send", async (request, reply) => {
    const { to } = request.body || {};

    if (!to) {
      return reply.status(400).send({ error: "El campo 'to' es requerido" });
    }

    if (!env.META_ACCESS_TOKEN || !env.META_PHONE_NUMBER_ID) {
      return reply.status(500).send({ error: "Credenciales de Meta Cloud API no configuradas" });
    }

    const phone = to.replace(/[^0-9]/g, "");

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${env.META_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: "hello_world",
            language: { code: "en_US" },
          },
        }),
      }
    );

    const data: any = await response.json();

    if (!response.ok) {
      return reply.status(response.status).send({
        success: false,
        error: data.error?.message || "Error de Meta Cloud API",
        details: data,
      });
    }

    return reply.send({
      success: true,
      message: `Mensaje enviado a ${phone}`,
      data,
    });
  });
}
