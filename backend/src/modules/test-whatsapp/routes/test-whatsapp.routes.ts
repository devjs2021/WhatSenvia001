import { FastifyInstance } from "fastify";

export async function testWhatsappRoutes(app: FastifyInstance) {
  app.post<{ Body: { to: string; accessToken: string; phoneNumberId: string } }>(
    "/send",
    async (request, reply) => {
      console.log("Test WhatsApp request received:", request.body);
      const { to, accessToken, phoneNumberId } = request.body || {};

      if (!to) {
        return reply.status(400).send({ error: "El campo 'to' es requerido" });
      }

      if (!accessToken || !phoneNumberId) {
        return reply.status(400).send({
          error: "Se requieren el Token de Acceso y el ID del numero de telefono",
        });
      }

      const phone = to.replace(/[^0-9]/g, "");

      try {
        const response = await fetch(
          `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
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
          return reply.status(400).send({
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
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message || "Error al conectar con la API de Meta",
        });
      }
    }
  );
}
