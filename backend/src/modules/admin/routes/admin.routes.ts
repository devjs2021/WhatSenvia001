import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { adminGuard, authGuard } from "../../../shared/middleware/auth.middleware.js";
import { db } from "../../../config/database.js";
import { users } from "../../../infrastructure/database/schema/users.js";
import { licenses } from "../../../infrastructure/database/schema/licenses.js";
import { LICENSE_PLANS } from "../../../infrastructure/database/schema/licenses.js";
import { licenseService } from "../services/license.service.js";
import { eq, desc, count } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
    const { userId, plan, durationDays, notes } = request.body as {
      userId: string;
      plan: string;
      durationDays?: number;
      notes?: string;
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
      { durationDays, notes }
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
}
