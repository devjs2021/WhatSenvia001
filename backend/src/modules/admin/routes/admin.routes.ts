import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { adminGuard, authGuard } from "../../../shared/middleware/auth.middleware.js";
import { db } from "../../../config/database.js";
import { users } from "../../../infrastructure/database/schema/users.js";
import { licenses } from "../../../infrastructure/database/schema/licenses.js";
import { LICENSE_PLANS } from "../../../infrastructure/database/schema/licenses.js";
import { licenseService } from "../services/license.service.js";
import { eq, desc, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { contacts } from "../../../infrastructure/database/schema/contacts.js";
import { campaigns } from "../../../infrastructure/database/schema/campaigns.js";
import { messages } from "../../../infrastructure/database/schema/messages.js";
import { chatMessages } from "../../../infrastructure/database/schema/chat.js";
import { whatsappSessions } from "../../../infrastructure/database/schema/whatsapp-sessions.js";
import { notifications } from "../../../infrastructure/database/schema/notifications.js";
import { metaTemplates } from "../../../infrastructure/database/schema/meta-templates.js";
import { WhatsAppService } from "../../whatsapp/services/whatsapp.service.js";

const whatsappService = new WhatsAppService();

export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require admin role
  app.addHook("preHandler", adminGuard);

  // ============================================================
  // USER MANAGEMENT
  // ============================================================

  // List all users with their active license
  app.get("/users", async () => {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        company: users.company,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get active licenses for each user
    const usersWithLicenses = await Promise.all(
      allUsers.map(async (user) => {
        const license = await licenseService.getActiveLicense(user.id);
        return {
          ...user,
          license: license
            ? {
                id: license.id,
                plan: license.plan,
                status: license.status,
                expiresAt: license.expiresAt,
                maxSessions: license.maxSessions,
                maxContacts: license.maxContacts,
                maxMessagesPerDay: license.maxMessagesPerDay,
              }
            : null,
        };
      })
    );

    return { success: true, data: usersWithLicenses };
  });

  // Get single user with full details
  app.get("/users/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        company: users.company,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) return reply.status(404).send({ error: "User not found" });

    const userLicenses = await licenseService.listByUser(id);
    const limits = await licenseService.checkLimits(id);

    return { success: true, data: { ...user, licenses: userLicenses, usage: limits } };
  });

  // Create user (admin creates a user)
  app.post("/users", async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, name, company, role } = request.body as {
      email: string;
      password: string;
      name: string;
      company?: string;
      role?: string;
    };

    if (!email?.trim() || !password || !name?.trim()) {
      return reply.status(422).send({ error: "Email, password y nombre son obligatorios" });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return reply.status(409).send({ error: "Email ya registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(users)
      .values({
        email: email.trim(),
        password: hashedPassword,
        name: name.trim(),
        company: company?.trim(),
        role: role || "user",
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        company: users.company,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return { success: true, data: user };
  });

  // Update user
  app.put("/users/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { name, company, role, isActive } = request.body as {
      name?: string;
      company?: string;
      role?: string;
      isActive?: boolean;
    };

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name.trim();
    if (company !== undefined) updateData.company = company?.trim() || null;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        company: users.company,
        role: users.role,
        isActive: users.isActive,
      });

    if (!updated) return reply.status(404).send({ error: "User not found" });
    return { success: true, data: updated };
  });

  // Reset user password
  app.post("/users/:id/reset-password", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { password } = request.body as { password: string };

    if (!password || password.length < 8) {
      return reply.status(422).send({ error: "Password must be at least 8 characters" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [updated] = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!updated) return reply.status(404).send({ error: "User not found" });
    return { success: true, message: "Password updated" };
  });

  // Delete user
  app.delete("/users/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    // Prevent deleting yourself
    if (id === (request as any).user.id) {
      return reply.status(400).send({ error: "No puedes eliminarte a ti mismo" });
    }

    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!deleted) return reply.status(404).send({ error: "User not found" });
    return { success: true };
  });

  // ============================================================
  // LICENSE MANAGEMENT
  // ============================================================

  // List all licenses
  app.get("/licenses", async () => {
    const data = await licenseService.listAll();
    return { success: true, data };
  });

  // Get available plans
  app.get("/licenses/plans", async () => {
    return { success: true, data: licenseService.getPlans() };
  });

  // Create license from plan
  app.post("/licenses/plan", async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, plan, durationDays, notes, maxSessions } = request.body as {
      userId: string;
      plan: string;
      durationDays?: number;
      notes?: string;
      maxSessions?: number;
    };

    if (!userId || !plan) {
      return reply.status(422).send({ error: "userId and plan are required" });
    }

    if (!(plan in LICENSE_PLANS)) {
      return reply.status(422).send({ error: `Invalid plan. Available: ${Object.keys(LICENSE_PLANS).join(", ")}` });
    }

    const license = await licenseService.createFromPlan(
      userId,
      plan as keyof typeof LICENSE_PLANS,
      (request as any).user.id,
      { durationDays, notes, maxSessions }
    );

    return { success: true, data: license };
  });

  // Create custom license
  app.post("/licenses/custom", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;

    if (!body?.userId) {
      return reply.status(422).send({ error: "userId is required" });
    }

    const license = await licenseService.createCustom(
      body.userId,
      (request as any).user.id,
      {
        plan: body.plan,
        durationDays: body.durationDays,
        maxSessions: body.maxSessions || 1,
        maxContacts: body.maxContacts || 100,
        maxCampaignsPerDay: body.maxCampaignsPerDay || 2,
        maxMessagesPerDay: body.maxMessagesPerDay || 100,
        features: body.features || {},
        notes: body.notes,
      }
    );

    return { success: true, data: license };
  });

  // Update license
  app.put("/licenses/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    // Convert expiresAt string to Date if provided
    if (body.expiresAt) body.expiresAt = new Date(body.expiresAt);

    const license = await licenseService.update(id, body);
    if (!license) return reply.status(404).send({ error: "License not found" });
    return { success: true, data: license };
  });

  // Suspend license
  app.post("/licenses/:id/suspend", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const license = await licenseService.suspend(id);
    if (!license) return reply.status(404).send({ error: "License not found" });
    return { success: true, data: license };
  });

  // Reactivate license
  app.post("/licenses/:id/reactivate", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const license = await licenseService.reactivate(id);
    if (!license) return reply.status(404).send({ error: "License not found" });
    return { success: true, data: license };
  });

  // Delete license
  app.delete("/licenses/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const deleted = await licenseService.delete(id);
    if (!deleted) return reply.status(404).send({ error: "License not found" });
    return { success: true };
  });

  // Check user limits/usage
  app.get("/users/:id/usage", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const usage = await licenseService.checkLimits(id);
    return { success: true, data: usage };
  });

  // Update maxSessions for a user's active license
  app.patch("/users/:id/max-sessions", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { maxSessions } = request.body as { maxSessions: number };

    if (typeof maxSessions !== "number" || maxSessions < 0) {
      return reply.status(422).send({ error: "maxSessions debe ser un número >= 0" });
    }

    const license = await licenseService.getActiveLicense(id);

    // If user has no active license, create one (custom plan) carrying just this limit
    if (!license) {
      const created = await licenseService.createCustom(id, (request as any).user.id, {
        plan: "custom",
        durationDays: 30,
        maxSessions,
        maxContacts: 100,
        maxCampaignsPerDay: 2,
        maxMessagesPerDay: 100,
        features: {
          campaigns: true,
          botBuilder: false,
          chatLive: true,
          polls: false,
          scheduledCampaigns: false,
          contactExtraction: false,
          import: true,
          reports: false,
          templates: true,
          campaignControl: false,
        },
        notes: "Creada automáticamente al asignar límite de sesiones",
      });
      return { success: true, data: created };
    }

    const updated = await licenseService.update(license.id, { maxSessions });
    return { success: true, data: updated };
  });

  // ============================================================
  // WHATSAPP SESSIONS MANAGEMENT (ADMIN)
  // ============================================================

  // List ALL sessions from all users with user info and usage
  app.get("/sessions", async () => {
    const allSessions = await db
      .select({
        id: whatsappSessions.id,
        userId: whatsappSessions.userId,
        name: whatsappSessions.name,
        phone: whatsappSessions.phone,
        status: whatsappSessions.status,
        connectionType: whatsappSessions.connectionType,
        wabaId: whatsappSessions.wabaId,
        lastConnectedAt: whatsappSessions.lastConnectedAt,
        createdAt: whatsappSessions.createdAt,
        userName: users.name,
        userEmail: users.email,
        userCompany: users.company,
        userIsActive: users.isActive,
      })
      .from(whatsappSessions)
      .leftJoin(users, eq(whatsappSessions.userId, users.id))
      .orderBy(desc(whatsappSessions.createdAt));

    // Attach maxSessions from active license per user
    const userIds = [...new Set(allSessions.map((s) => s.userId))];
    const licenseLimits: Record<string, number> = {};
    const sessionCounts: Record<string, number> = {};

    for (const userId of userIds) {
      const license = await licenseService.getActiveLicense(userId);
      licenseLimits[userId] = license?.maxSessions ?? 0;
      sessionCounts[userId] = allSessions.filter((s) => s.userId === userId).length;
    }

    const result = allSessions.map((s) => ({
      ...s,
      maxSessions: licenseLimits[s.userId] ?? 0,
      totalSessionsForUser: sessionCounts[s.userId] ?? 0,
    }));

    return { success: true, data: result };
  });

  // Delete/force-remove a specific session (admin power)
  app.delete("/sessions/:sessionId", async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.params as { sessionId: string };

    const [session] = await db
      .select()
      .from(whatsappSessions)
      .where(eq(whatsappSessions.id, sessionId))
      .limit(1);

    if (!session) return reply.status(404).send({ error: "Sesión no encontrada" });

    // Disconnect active provider if needed
    try {
      await whatsappService.deleteSession(sessionId, session.userId);
    } catch {
      // Force delete even if disconnect fails
      await db.delete(whatsappSessions).where(eq(whatsappSessions.id, sessionId));
    }

    return { success: true };
  });

  // Disconnect (but keep) a session
  app.post("/sessions/:sessionId/disconnect", async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.params as { sessionId: string };

    const [session] = await db
      .select()
      .from(whatsappSessions)
      .where(eq(whatsappSessions.id, sessionId))
      .limit(1);

    if (!session) return reply.status(404).send({ error: "Sesión no encontrada" });

    try {
      await whatsappService.disconnectSession(sessionId, session.userId);
    } catch {
      await db
        .update(whatsappSessions)
        .set({ status: "disconnected", updatedAt: new Date() })
        .where(eq(whatsappSessions.id, sessionId));
    }

    return { success: true };
  });

  // ============================================================
  // ADMIN DASHBOARD
  // ============================================================

  app.get("/stats", async () => {
    const [userCount] = await db.select({ total: count() }).from(users);
    const [licenseCount] = await db.select({ total: count() }).from(licenses).where(eq(licenses.status, "active"));

    // Users by role
    const roleStats = await db
      .select({ role: users.role, total: count() })
      .from(users)
      .groupBy(users.role);

    // Licenses by plan
    const planStats = await db
      .select({ plan: licenses.plan, total: count() })
      .from(licenses)
      .where(eq(licenses.status, "active"))
      .groupBy(licenses.plan);

    return {
      success: true,
      data: {
        totalUsers: userCount.total,
        activeLicenses: licenseCount.total,
        roleStats: Object.fromEntries(roleStats.map((r) => [r.role, r.total])),
        planStats: Object.fromEntries(planStats.map((p) => [p.plan, p.total])),
      },
    };
  });

  // ============================================================
  // SEED DEMO DATA (for video recording)
  // ============================================================
  app.post("/seed-demo", async (request: FastifyRequest) => {
    const userId = (request as any).user.id;

    const [session] = await db.select().from(whatsappSessions).where(eq(whatsappSessions.userId, userId)).limit(1);
    const sessionId = session?.id || null;
    const wabaId = "1186945711159195";

    const demoContacts = [
      { phone: "573001234567", name: "Carlos Méndez", email: "carlos@empresa.co", tags: ["cliente", "premium"] },
      { phone: "573009876543", name: "María García", email: "maria@tienda.co", tags: ["cliente", "nuevo"] },
      { phone: "573005551234", name: "Andrés López", email: "andres@startup.io", tags: ["lead", "interesado"] },
      { phone: "573008884321", name: "Laura Rodríguez", email: "laura@marketing.co", tags: ["cliente", "premium"] },
      { phone: "573002223344", name: "Juan Pérez", email: "juan@comercio.co", tags: ["lead"] },
      { phone: "573007776655", name: "Sofía Martínez", email: "sofia@digital.co", tags: ["cliente", "vip"] },
      { phone: "573004443322", name: "Diego Herrera", email: "diego@corp.co", tags: ["cliente"] },
      { phone: "573006665544", name: "Valentina Torres", email: "val@shop.co", tags: ["lead", "interesado"] },
      { phone: "573003332211", name: "Santiago Ruiz", email: "santi@tech.co", tags: ["cliente", "premium"] },
      { phone: "573001119988", name: "Camila Vargas", email: "camila@negocios.co", tags: ["cliente"] },
      { phone: "573008887766", name: "Felipe Castro", email: "felipe@ventas.co", tags: ["lead"] },
      { phone: "573005554433", name: "Isabella Moreno", email: "isabella@moda.co", tags: ["cliente", "vip"] },
    ];

    // Contacts
    const contactIds: Record<string, string> = {};
    for (const c of demoContacts) {
      const existing = await db.select().from(contacts).where(eq(contacts.phone, c.phone)).limit(1);
      if (existing.length > 0) { contactIds[c.phone] = existing[0].id; continue; }
      const [created] = await db.insert(contacts).values({ userId, phone: c.phone, name: c.name, email: c.email, tags: c.tags, stage: "new" }).returning();
      contactIds[c.phone] = created.id;
    }

    // Campaigns
    const demoCampaigns = [
      { name: "Black Friday 2026 — Ofertas Exclusivas", message: "🔥 ¡Black Friday! Hasta 70% OFF", status: "completed" as const, totalContacts: 3500, sentCount: 3420, deliveredCount: 3380, failedCount: 80, daysAgo: 3 },
      { name: "Lanzamiento Colección Verano", message: "☀️ Nueva colección de verano disponible", status: "completed" as const, totalContacts: 2150, sentCount: 2130, deliveredCount: 2100, failedCount: 20, daysAgo: 7 },
      { name: "Recordatorio Pago Mensual", message: "Recordamos que tu pago vence pronto", status: "completed" as const, totalContacts: 1200, sentCount: 1195, deliveredCount: 1180, failedCount: 5, daysAgo: 1 },
      { name: "Encuesta Satisfacción — Mayo", message: "Tu opinión nos importa. Responde nuestra encuesta", status: "completed" as const, totalContacts: 5000, sentCount: 4920, deliveredCount: 4850, failedCount: 80, daysAgo: 14 },
      { name: "Promo Navidad — Early Bird", message: "🎄 30% en toda la tienda. Código NAVIDAD30", status: "scheduled" as const, totalContacts: 8000, sentCount: 0, deliveredCount: 0, failedCount: 0, daysAgo: 0 },
      { name: "Bienvenida Nuevos Suscriptores", message: "¡Bienvenido/a! Cupón 15%: BIENVENIDO15", status: "completed" as const, totalContacts: 450, sentCount: 448, deliveredCount: 445, failedCount: 2, daysAgo: 5 },
    ];

    for (const camp of demoCampaigns) {
      const startedAt = new Date(Date.now() - camp.daysAgo * 86400000);
      const completedAt = camp.status === "completed" ? new Date(startedAt.getTime() + 3600000) : null;
      const [created] = await db.insert(campaigns).values({ userId, sessionId, name: camp.name, message: camp.message, status: camp.status, totalContacts: camp.totalContacts, sentCount: camp.sentCount, deliveredCount: camp.deliveredCount, failedCount: camp.failedCount, startedAt, completedAt, createdAt: startedAt }).returning();
      if (camp.status === "completed") {
        for (const [phone, contactId] of Object.entries(contactIds).slice(0, 5)) {
          await db.insert(messages).values({ userId, contactId, campaignId: created.id, phone, content: camp.message, status: "delivered", sentAt: new Date(startedAt.getTime() + Math.random() * 3600000), deliveredAt: new Date(startedAt.getTime() + Math.random() * 3600000 + 60000) });
        }
      }
    }

    // Chat conversations
    if (sessionId) {
      const chatConvos = [
        { phone: "573001234567", pushName: "Carlos Méndez", msgs: [
          { c: "Hola, me interesa saber más sobre sus planes de envío masivo", d: "incoming" as const, m: 45 },
          { c: "¡Hola Carlos! Tenemos planes desde $69/mes con envíos ilimitados", d: "outgoing" as const, m: 43 },
          { c: "¿Incluye conexión con la API de Meta?", d: "incoming" as const, m: 40 },
          { c: "Sí, todos incluyen Meta Cloud API, verificación oficial y sin riesgo de baneo", d: "outgoing" as const, m: 38 },
          { c: "Excelente, me gustaría activar el plan Pro", d: "incoming" as const, m: 35 },
          { c: "¡Perfecto! Te envío el link. Tendrás 7 días gratis", d: "outgoing" as const, m: 33 },
          { c: "Gracias, ya lo activé. ¿Cómo conecto mi número?", d: "incoming" as const, m: 10 },
        ]},
        { phone: "573009876543", pushName: "María García", msgs: [
          { c: "Buenos días, necesito enviar una promo a 2,000 clientes", d: "incoming" as const, m: 120 },
          { c: "¡Buenos días María! Con ClickSend puedes hacerlo fácil. ¿Tienes tu lista?", d: "outgoing" as const, m: 118 },
          { c: "Sí, tengo un Excel con todos los números", d: "incoming" as const, m: 115 },
          { c: "Ve a Contactos > Importar y sube tu archivo", d: "outgoing" as const, m: 113 },
          { c: "Listo, importé 2,150 contactos. ¿Ahora cómo creo la campaña?", d: "incoming" as const, m: 60 },
          { c: "¡Increíble! Ya quedó programada para las 10am 🎉", d: "incoming" as const, m: 30 },
        ]},
        { phone: "573008884321", pushName: "Laura Rodríguez", msgs: [
          { c: "La campaña de Black Friday fue un éxito total 🔥", d: "incoming" as const, m: 15 },
          { c: "¡Qué buena noticia Laura! ¿Cuántas conversiones tuviste?", d: "outgoing" as const, m: 13 },
          { c: "342 ventas directas. ROI del 850%", d: "incoming" as const, m: 10 },
          { c: "¡Increíble! ¿Quieres que programemos la de Navidad?", d: "outgoing" as const, m: 8 },
          { c: "Sí, quiero enviar a toda mi base de 8,000 clientes", d: "incoming" as const, m: 5 },
        ]},
        { phone: "573007776655", pushName: "Sofía Martínez", msgs: [
          { c: "El chatbot está respondiendo perfecto, mis clientes encantados", d: "incoming" as const, m: 90 },
          { c: "¡Me alegra Sofía! ¿Necesitas agregar algún flujo nuevo?", d: "outgoing" as const, m: 88 },
          { c: "Sí, quiero uno de seguimiento post-venta", d: "incoming" as const, m: 85 },
        ]},
        { phone: "573002223344", pushName: "Juan Pérez", msgs: [
          { c: "Hola, ¿tienen descuento para agencias?", d: "incoming" as const, m: 3 },
        ]},
      ];

      for (const conv of chatConvos) {
        const existing = await db.select().from(chatMessages).where(eq(chatMessages.phone, conv.phone)).limit(1);
        if (existing.length > 0) continue;
        for (const msg of conv.msgs) {
          await db.insert(chatMessages).values({ sessionId, phone: conv.phone, content: msg.c, direction: msg.d, senderType: msg.d === "incoming" ? "user" : "human", pushName: conv.pushName, status: msg.d === "outgoing" ? "delivered" : "sent", createdAt: new Date(Date.now() - msg.m * 60000) });
        }
      }
    }

    // Meta Templates
    const demoTemplates = [
      { mid: "tmpl_001", name: "promo_imagen", cat: "MARKETING", comps: [{ type: "HEADER", format: "IMAGE" }, { type: "BODY", text: "Hola {{1}}, tenemos una promoción especial para ti. ¡Descuentos de hasta {{2}}% en toda la tienda!", example: { body_text: [["Carlos", "50"]] } }, { type: "FOOTER", text: "Válido hasta agotar existencias" }, { type: "BUTTONS", buttons: [{ type: "URL", text: "Ver ofertas", url: "https://tienda.com/ofertas" }] }] },
      { mid: "tmpl_002", name: "bienvenida_cliente", cat: "MARKETING", comps: [{ type: "BODY", text: "¡Hola {{1}}! 🎉 Bienvenido/a. Cupón 15%: BIENVENIDO15", example: { body_text: [["María"]] } }, { type: "BUTTONS", buttons: [{ type: "URL", text: "Ir a la tienda", url: "https://tienda.com" }] }] },
      { mid: "tmpl_003", name: "recordatorio_pago", cat: "UTILITY", comps: [{ type: "BODY", text: "Hola {{1}}, tu pago de {{2}} vence el {{3}}. Evita recargos.", example: { body_text: [["Juan", "$150.000", "15 de junio"]] } }, { type: "BUTTONS", buttons: [{ type: "URL", text: "Pagar ahora", url: "https://pagos.com" }] }] },
      { mid: "tmpl_004", name: "confirmacion_pedido", cat: "UTILITY", comps: [{ type: "BODY", text: "¡Gracias {{1}}! 🛍️ Pedido #{{2}} confirmado. Llega en {{3}} días hábiles.", example: { body_text: [["Laura", "ORD-5847", "3-5"]] } }] },
      { mid: "tmpl_005", name: "encuesta_satisfaccion", cat: "MARKETING", comps: [{ type: "BODY", text: "Hola {{1}}, ¿podrías responder nuestra encuesta de 2 minutos?", example: { body_text: [["Sofía"]] } }, { type: "BUTTONS", buttons: [{ type: "URL", text: "Responder", url: "https://encuesta.com" }, { type: "QUICK_REPLY", text: "Ahora no" }] }] },
      { mid: "tmpl_006", name: "oferta_flash", cat: "MARKETING", comps: [{ type: "HEADER", format: "IMAGE" }, { type: "BODY", text: "⚡ {{1}}, solo por {{2}} horas: {{3}}% OFF en seleccionados", example: { body_text: [["Diego", "24", "40"]] } }, { type: "BUTTONS", buttons: [{ type: "URL", text: "Comprar", url: "https://tienda.com/flash" }] }] },
      { mid: "tmpl_007", name: "seguimiento_envio", cat: "UTILITY", comps: [{ type: "BODY", text: "Hola {{1}}, pedido #{{2}} despachado 📦. Tracking: {{3}}", example: { body_text: [["Valentina", "ORD-3921", "COL-892741"]] } }, { type: "BUTTONS", buttons: [{ type: "URL", text: "Rastrear", url: "https://rastreo.com" }] }] },
      { mid: "tmpl_008", name: "reactivacion_cliente", cat: "MARKETING", comps: [{ type: "BODY", text: "¡Hola {{1}}! Te extrañamos 😊. Vuelve y recibe {{2}}% OFF exclusivo.", example: { body_text: [["Santiago", "20"]] } }, { type: "BUTTONS", buttons: [{ type: "URL", text: "Ver novedades", url: "https://tienda.com" }] }] },
      { mid: "tmpl_009", name: "cita_recordatorio", cat: "UTILITY", comps: [{ type: "BODY", text: "Hola {{1}}, tu cita es el {{2}} a las {{3}}.", example: { body_text: [["Camila", "lunes 10", "3:00 PM"]] } }, { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Confirmar" }, { type: "QUICK_REPLY", text: "Reagendar" }] }] },
      { mid: "tmpl_010", name: "black_friday_vip", cat: "MARKETING", comps: [{ type: "HEADER", format: "VIDEO" }, { type: "BODY", text: "🔥 {{1}}, como VIP tienes acceso anticipado. Hasta {{2}}% OFF", example: { body_text: [["Isabella", "70"]] } }, { type: "BUTTONS", buttons: [{ type: "URL", text: "Acceder", url: "https://tienda.com/vip" }] }] },
    ];

    for (const t of demoTemplates) {
      const existing = await db.select().from(metaTemplates).where(eq(metaTemplates.metaTemplateId, t.mid)).limit(1);
      if (existing.length > 0) continue;
      await db.insert(metaTemplates).values({ userId, wabaId, metaTemplateId: t.mid, name: t.name, status: "APPROVED", category: t.cat, language: "es", components: t.comps });
    }

    // Notifications
    const demoNotifs = [
      { type: "campaign_completed" as const, title: 'Campaña "Black Friday 2026" completada', body: "3,420 enviados, 80 fallidos de 3,500", m: 180 },
      { type: "campaign_completed" as const, title: 'Campaña "Recordatorio Pago" completada', body: "1,195 enviados, 5 fallidos de 1,200", m: 60 },
      { type: "new_chat" as const, title: "Nuevo mensaje de Carlos Méndez", body: "Gracias, ya lo activé", m: 10 },
      { type: "new_chat" as const, title: "Nuevo mensaje de Laura Rodríguez", body: "Quiero enviar a 8,000 clientes", m: 5 },
      { type: "campaign_scheduled" as const, title: 'Campaña "Promo Navidad" programada', body: "8,000 contactos listos", m: 30 },
      { type: "new_chat" as const, title: "Nuevo mensaje de Juan Pérez", body: "¿Tienen descuento para agencias?", m: 3 },
    ];

    for (const n of demoNotifs) {
      await db.insert(notifications).values({ userId, type: n.type, title: n.title, body: n.body, read: n.m > 120, createdAt: new Date(Date.now() - n.m * 60000) });
    }

    return { success: true, message: "Demo data seeded: 12 contacts, 6 campaigns, 5 chats, 10 Meta templates, 6 notifications" };
  });
}
