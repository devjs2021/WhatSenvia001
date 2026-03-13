import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authGuard, licenseGuard } from "../../shared/middleware/auth.middleware.js";
import { db } from "../../config/database.js";
import { messageTemplates } from "../../infrastructure/database/schema/message-templates.js";
import { eq, desc, count, ilike, and } from "drizzle-orm";

export async function templateRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // List all templates
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const { search, category } = request.query as { search?: string; category?: string };
    const userId = (request as any).user.id;

    const conditions = [eq(messageTemplates.userId, userId)];
    if (search) conditions.push(ilike(messageTemplates.name, `%${search}%`));
    if (category) conditions.push(eq(messageTemplates.category, category));

    const templates = await db
      .select()
      .from(messageTemplates)
      .where(and(...conditions))
      .orderBy(desc(messageTemplates.updatedAt));

    return { success: true, data: templates };
  });

  // Get categories
  app.get("/categories", async (request: FastifyRequest) => {
    const userId = (request as any).user.id;
    const rows = await db
      .select({ category: messageTemplates.category })
      .from(messageTemplates)
      .where(eq(messageTemplates.userId, userId))
      .groupBy(messageTemplates.category);

    const categories = rows
      .map((r) => r.category)
      .filter((c): c is string => !!c);

    return { success: true, data: categories };
  });

  // Create template
  app.post("/", { preHandler: [licenseGuard("templates")] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, content, category } = request.body as {
      name: string;
      content: string;
      category?: string;
    };

    if (!name?.trim() || !content?.trim()) {
      return reply.status(422).send({ error: "Nombre y contenido son obligatorios" });
    }

    const userId = (request as any).user.id;
    const [template] = await db
      .insert(messageTemplates)
      .values({ userId, name: name.trim(), content, category: category?.trim() || null })
      .returning();

    return { success: true, data: template };
  });

  // Update template
  app.put("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { name, content, category } = request.body as {
      name?: string;
      content?: string;
      category?: string;
    };

    const userId = (request as any).user.id;
    const [updated] = await db
      .update(messageTemplates)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category: category?.trim() || null }),
        updatedAt: new Date(),
      })
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, userId)))
      .returning();

    if (!updated) return reply.status(404).send({ error: "Plantilla no encontrada" });
    return { success: true, data: updated };
  });

  // Delete template
  app.delete("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user.id;

    const [deleted] = await db
      .delete(messageTemplates)
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, userId)))
      .returning({ id: messageTemplates.id });

    if (!deleted) return reply.status(404).send({ error: "Plantilla no encontrada" });
    return { success: true };
  });
}
