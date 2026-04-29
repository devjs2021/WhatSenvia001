import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import websocket from "@fastify/websocket";
import multipart from "@fastify/multipart";
import formbody from "@fastify/formbody";
import { env } from "./config/env.js";
import { db } from "./config/database.js";
import { redis } from "./config/redis.js";
import { sql, eq } from "drizzle-orm";
import { users } from "./infrastructure/database/schema/users.js";

import { authRoutes } from "./modules/auth/routes/auth.routes.js";
import { contactRoutes } from "./modules/contacts/routes/contact.routes.js";
import { campaignRoutes } from "./modules/campaigns/routes/campaign.routes.js";
import { messageRoutes } from "./modules/messages/routes/message.routes.js";
import { whatsappRoutes } from "./modules/whatsapp/routes/whatsapp.routes.js";
import { botBuilderRoutes } from "./modules/bot-builder/routes/bot-builder.routes.js";
import { pollRoutes } from "./modules/polls/routes/poll.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { templateRoutes } from "./modules/templates/templates.routes.js";
import { contactListRoutes } from "./modules/contact-lists/contact-lists.routes.js";
import { chatRoutes } from "./modules/chat/routes/chat.routes.js";
import { campaignControlRoutes } from "./modules/campaign-control/routes/campaign-control.routes.js";
import { scheduledRoutes } from "./modules/scheduled/routes/scheduled.routes.js";
import { adminRoutes } from "./modules/admin/routes/admin.routes.js";
import { testWhatsappRoutes } from "./modules/test-whatsapp/routes/test-whatsapp.routes.js";
import { startMessageWorker } from "./infrastructure/queue/message.queue.js";
import { startCampaignWorker } from "./infrastructure/queue/campaign.queue.js";
import { startScheduledChecker } from "./infrastructure/queue/scheduled-checker.js";
import { seedTemplates } from "./modules/bot-builder/services/seed-templates.js";
import { WhatsAppService } from "./modules/whatsapp/services/whatsapp.service.js";

const app = Fastify({
  logger: env.NODE_ENV === "development"
    ? { level: "debug", transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } } }
    : { level: "info" },
});

async function bootstrap() {
  // Allow empty body with content-type: application/json (Next.js proxy adds this header)
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    if (!body || (body as string).length === 0) {
      done(null, undefined);
      return;
    }
    try {
      done(null, JSON.parse(body as string));
    } catch (err: any) {
      done(err, undefined);
    }
  });
  // Plugins
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // Next.js handles CSP
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  await app.register(rateLimit, {
    max: env.API_RATE_LIMIT,
    timeWindow: "1 minute",
  });

  await app.register(websocket);

  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  await app.register(formbody);

  // Auth decorator
  app.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: "Unauthorized" });
    }
  });

  // Routes
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(contactRoutes, { prefix: "/api/contacts" });
  await app.register(campaignRoutes, { prefix: "/api/campaigns" });
  await app.register(messageRoutes, { prefix: "/api/messages" });
  await app.register(whatsappRoutes, { prefix: "/api/whatsapp" });
  await app.register(botBuilderRoutes, { prefix: "/api/bot-builder" });
  await app.register(pollRoutes, { prefix: "/api/polls" });
  await app.register(dashboardRoutes, { prefix: "/api/dashboard" });
  await app.register(templateRoutes, { prefix: "/api/templates" });
  await app.register(contactListRoutes, { prefix: "/api/contact-lists" });
  await app.register(chatRoutes, { prefix: "/api/chat" });
  await app.register(campaignControlRoutes, { prefix: "/api/campaign-control" });
  await app.register(scheduledRoutes, { prefix: "/api/scheduled" });
  await app.register(adminRoutes, { prefix: "/api/admin" });
  await app.register(testWhatsappRoutes, { prefix: "/api/test-whatsapp" });

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    const statusCode = (error as any).statusCode || 500;
    if (statusCode >= 500) {
      app.log.error(error);
    }
    reply.status(statusCode).send({
      error: statusCode >= 500 ? "Internal Server Error" : (error as Error).message,
      statusCode,
    });
  });

  // Health check with DB + Redis verification
  app.get("/api/health", async () => {
    const checks: Record<string, string> = {};
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = "ok";
    } catch {
      checks.database = "error";
    }
    try {
      const pong = await redis.ping();
      checks.redis = pong === "PONG" ? "ok" : "error";
    } catch {
      checks.redis = "error";
    }
    const allOk = Object.values(checks).every((v) => v === "ok");
    return {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  });

  // Temporary auto-migration for Meta review compliance
  try {
    app.log.info("Checking database schema for facebook_id column...");
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) UNIQUE`);
    app.log.info("Database schema is up to date.");

    // Auto-seed reviewer for Meta
    const reviewerEmail = "meta_reviewer@callmesd.com";
    const [existingReviewer] = await db.select().from(users).where(eq(users.email, reviewerEmail)).limit(1);
    
    if (!existingReviewer) {
      app.log.info("Seeding Meta reviewer account...");
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.default.hash("MetaReview2026!", 12);
      await db.insert(users).values({
        email: reviewerEmail,
        password: hashedPassword,
        name: "Meta Reviewer",
        role: "admin",
        company: "Meta Review Team",
        isActive: true
      });
      app.log.info("Meta reviewer account created.");
    }
  } catch (err: any) {
    app.log.warn(`Auto-migration/seed note: ${err.message}`);
  }

  // Start queue workers
  startMessageWorker();
  startCampaignWorker();
  startScheduledChecker();
  app.log.info("Queue workers started");

  // Seed bot templates
  seedTemplates().catch(() => {});

  // Restore WhatsApp sessions from previous run
  const whatsappService = new WhatsAppService();
  whatsappService.restoreSessions().catch((err) => {
    console.error("Failed to restore WhatsApp sessions:", err.message);
  });

  // Start
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Server running on http://${env.HOST}:${env.PORT}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export { app };
