import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import websocket from "@fastify/websocket";
import multipart from "@fastify/multipart";
import formbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import path from "path";
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
import { metaTemplateRoutes } from "./modules/meta-templates/routes/meta-template.routes.js";
import { metaWebhookRoutes } from "./modules/meta-webhook/routes/meta-webhook.routes.js";
import { metaExchangeRoutes } from "./modules/meta-webhook/routes/meta-exchange.routes.js";
import { consumptionRoutes } from "./modules/consumption/consumption.routes.js";
import { notificationRoutes } from "./modules/notifications/routes/notification.routes.js";
import { startMessageWorker } from "./infrastructure/queue/message.queue.js";
import { startCampaignWorker } from "./infrastructure/queue/campaign.queue.js";
import { startScheduledChecker } from "./infrastructure/queue/scheduled-checker.js";
import { startTemplateSyncJob } from "./infrastructure/queue/template-sync.js";
import { startVerificationWorker } from "./infrastructure/queue/verification.queue.js";
import { startLicenseExpiryChecker } from "./infrastructure/queue/license-expiry-checker.js";
import { startTokenRefreshJob } from "./infrastructure/queue/token-refresh.js";
import { migrate } from "drizzle-orm/node-postgres/migrator";
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
    redis: redis,
  });

  await app.register(websocket);

  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  await app.register(formbody);

  // Serve uploaded media files
  const uploadsDir = path.join(process.cwd(), "uploads");
  const fs = await import("fs");
  fs.mkdirSync(uploadsDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: "/uploads/",
    decorateReply: false,
  });

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
  await app.register(metaTemplateRoutes, { prefix: "/api/meta-templates" });
  await app.register(consumptionRoutes, { prefix: "/api/consumption" });
  await app.register(notificationRoutes, { prefix: "/api/notifications" });

  // Meta Webhook (sin prefijo /api porque Meta llama directamente a /meta-webhook)
  await app.register(metaWebhookRoutes);

  // Meta Exchange Token (Embedded Signup)
  await app.register(metaExchangeRoutes);

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

  // Run Drizzle migrations on startup
  try {
    app.log.info("Running database migrations...");
    await migrate(db, { migrationsFolder: "./src/infrastructure/database/migrations" });
    app.log.info("Database migrations completed.");
  } catch (err: any) {
    if (err.code === "42P07") {
      app.log.warn("Migration skipped: tables already exist (created via db:push)");
    } else {
      app.log.error({ error: err.message }, "Migration failed");
      throw err;
    }
  }

  // Create refresh_tokens table if not exists
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        user_agent VARCHAR(500),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON refresh_tokens(token)`);
  } catch (err: any) {
    app.log.warn({ error: err.message }, "Refresh tokens table setup warning");
  }

  // Create meta_templates table if not exists
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS meta_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        waba_id VARCHAR(100) NOT NULL,
        meta_template_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(30) NOT NULL,
        category VARCHAR(50) NOT NULL,
        language VARCHAR(10) NOT NULL,
        components JSONB DEFAULT '[]',
        last_synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(waba_id, meta_template_id, language)
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS meta_templates_user_id_idx ON meta_templates(user_id)`);
    await db.execute(sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_template_campaign BOOLEAN DEFAULT FALSE`);
    await db.execute(sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_template_id UUID REFERENCES meta_templates(id) ON DELETE SET NULL`);
    await db.execute(sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_params JSONB`);
    await db.execute(sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_name VARCHAR(255)`);
    await db.execute(sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS contacts JSONB`);
    await db.execute(sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS verification_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id UUID NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      phones JSONB NOT NULL,
      valid_phones JSONB DEFAULT '[]',
      invalid_phones JSONB DEFAULT '[]',
      total_count INTEGER NOT NULL DEFAULT 0,
      checked_count INTEGER NOT NULL DEFAULT 0,
      error VARCHAR(500),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      completed_at TIMESTAMP
    )`);
  } catch (err: any) {
    app.log.warn({ error: err.message }, "Meta templates table setup warning");
  }

  // Auto-migration: contacts stage column
  try {
    await db.execute(sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS stage VARCHAR(20) DEFAULT 'new'`);
  } catch (err: any) {
    app.log.warn({ error: err.message }, "Contacts stage column warning");
  }

  // Auto-migration: ensure facebook_id column exists
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) UNIQUE`);
  } catch (err: any) {
    app.log.warn(`Auto-migration note: ${err.message}`);
  }

  // Auto-migration: ensure Meta Cloud columns exist on whatsapp_sessions
  try {
    await db.execute(sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS connection_type VARCHAR(20) NOT NULL DEFAULT 'baileys'`);
    await db.execute(sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS waba_id VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS meta_phone_number_id VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS meta_access_token TEXT`);
    await db.execute(sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS meta_business_id VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS meta_token_expires_at TIMESTAMP`);
  } catch (err: any) {
    app.log.warn(`Auto-migration (whatsapp_sessions) note: ${err.message}`);
  }

  // Auto-migration: bot conversation states table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bot_conversation_states (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(30) NOT NULL,
        session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
        flow_id UUID NOT NULL REFERENCES bot_flows(id) ON DELETE CASCADE,
        remote_jid VARCHAR(100) NOT NULL,
        current_node_id VARCHAR(100),
        variables JSONB DEFAULT '{}',
        waiting_for_input VARCHAR(100),
        last_activity BIGINT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS bot_conv_phone_session_idx ON bot_conversation_states(phone, session_id)`);
  } catch (err: any) {
    app.log.warn(`Auto-migration (bot_conversation_states) note: ${err.message}`);
  }

  // Auto-migration: consumption tracking columns on messages
  try {
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10,6)`);
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_category VARCHAR(20)`);
  } catch (err: any) {
    app.log.warn(`Auto-migration (messages consumption) note: ${err.message}`);
  }

  // Auto-migration: ensure media columns exist on chat_messages
  try {
    await db.execute(sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS media_url VARCHAR(500)`);
    await db.execute(sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS media_type VARCHAR(50)`);
  } catch (err: any) {
    app.log.warn(`Auto-migration (chat_messages media) note: ${err.message}`);
  }

  // Start queue workers
  startMessageWorker();
  startCampaignWorker();
  startScheduledChecker();
  startTemplateSyncJob();
  startVerificationWorker();
  startLicenseExpiryChecker();
  startTokenRefreshJob();
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
