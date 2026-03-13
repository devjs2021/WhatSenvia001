import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authGuard } from "../../shared/middleware/auth.middleware.js";
import { db } from "../../config/database.js";
import { contactLists, contactListMembers } from "../../infrastructure/database/schema/contact-lists.js";
import { eq, desc, count, and } from "drizzle-orm";

export async function contactListRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // List all contact lists
  app.get("/", async (request: FastifyRequest) => {
    const userId = (request as any).user.id;
    const lists = await db
      .select()
      .from(contactLists)
      .where(eq(contactLists.userId, userId))
      .orderBy(desc(contactLists.updatedAt));

    return { success: true, data: lists };
  });

  // Get a list with its members
  app.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user.id;

    const [list] = await db
      .select()
      .from(contactLists)
      .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)))
      .limit(1);

    if (!list) return reply.status(404).send({ error: "Lista no encontrada" });

    const members = await db
      .select()
      .from(contactListMembers)
      .where(eq(contactListMembers.listId, id))
      .orderBy(contactListMembers.name);

    return { success: true, data: { ...list, members } };
  });

  // Get phones for a list (for sending)
  app.get("/:id/phones", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user.id;

    const [list] = await db
      .select()
      .from(contactLists)
      .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)))
      .limit(1);

    if (!list) return reply.status(404).send({ error: "Lista no encontrada" });

    const members = await db
      .select({ phone: contactListMembers.phone })
      .from(contactListMembers)
      .where(eq(contactListMembers.listId, id));

    return { success: true, data: members.map((m) => m.phone) };
  });

  // Create list with members (phones)
  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, description, phones } = request.body as {
      name: string;
      description?: string;
      phones: { phone: string; name?: string }[];
    };

    if (!name?.trim()) {
      return reply.status(422).send({ error: "Nombre es obligatorio" });
    }
    if (!phones || phones.length === 0) {
      return reply.status(422).send({ error: "La lista debe tener al menos un contacto" });
    }

    const userId = (request as any).user.id;

    const normalizedPhones = phones.map((p) => ({
      phone: p.phone.replace(/[\s\-\(\)]/g, "").replace(/^\+/, ""),
      name: p.name || null,
    }));

    const [list] = await db
      .insert(contactLists)
      .values({
        userId,
        name: name.trim(),
        description: description?.trim() || null,
        contactCount: normalizedPhones.length,
      })
      .returning();

    if (normalizedPhones.length > 0) {
      await db.insert(contactListMembers).values(
        normalizedPhones.map((p) => ({
          listId: list.id,
          phone: p.phone,
          name: p.name,
        }))
      );
    }

    return { success: true, data: list };
  });

  // Update list name/description
  app.put("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { name, description } = request.body as { name?: string; description?: string };
    const userId = (request as any).user.id;

    const [updated] = await db
      .update(contactLists)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        updatedAt: new Date(),
      })
      .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)))
      .returning();

    if (!updated) return reply.status(404).send({ error: "Lista no encontrada" });
    return { success: true, data: updated };
  });

  // Delete list
  app.delete("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user.id;

    const [deleted] = await db
      .delete(contactLists)
      .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)))
      .returning({ id: contactLists.id });

    if (!deleted) return reply.status(404).send({ error: "Lista no encontrada" });
    return { success: true };
  });

  // Add members to existing list
  app.post("/:id/members", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { phones } = request.body as { phones: { phone: string; name?: string }[] };
    const userId = (request as any).user.id;

    const [list] = await db
      .select()
      .from(contactLists)
      .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)))
      .limit(1);

    if (!list) return reply.status(404).send({ error: "Lista no encontrada" });

    const normalizedPhones = phones.map((p) => ({
      phone: p.phone.replace(/[\s\-\(\)]/g, "").replace(/^\+/, ""),
      name: p.name || null,
    }));

    if (normalizedPhones.length > 0) {
      await db.insert(contactListMembers).values(
        normalizedPhones.map((p) => ({
          listId: id,
          phone: p.phone,
          name: p.name,
        }))
      );

      const [{ total }] = await db
        .select({ total: count() })
        .from(contactListMembers)
        .where(eq(contactListMembers.listId, id));

      await db
        .update(contactLists)
        .set({ contactCount: total, updatedAt: new Date() })
        .where(eq(contactLists.id, id));
    }

    return { success: true, data: { added: normalizedPhones.length } };
  });
}
