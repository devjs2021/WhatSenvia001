import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../../config/database.js";
import { licenses } from "../../infrastructure/database/schema/licenses.js";
import { eq, and } from "drizzle-orm";
import type { LicenseFeatures } from "../../infrastructure/database/schema/licenses.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string; // "admin" | "user"
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
  }
}

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<AuthUser>();
    request.user = decoded;
  } catch (err) {
    reply.status(401).send({ error: "Unauthorized" });
  }
}

export async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<AuthUser>();
    request.user = decoded;
    if (decoded.role !== "admin") {
      reply.status(403).send({ error: "Admin access required" });
    }
  } catch (err) {
    reply.status(401).send({ error: "Unauthorized" });
  }
}

// Factory: creates a guard that checks if the user's license has a specific feature enabled
export function licenseGuard(feature: keyof LicenseFeatures) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Admin bypasses license checks
    if (request.user?.role === "admin") return;

    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const [license] = await db
      .select()
      .from(licenses)
      .where(and(eq(licenses.userId, userId), eq(licenses.status, "active")))
      .limit(1);

    if (!license) {
      return reply.status(403).send({ error: "No active license found" });
    }

    // Check expiration
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      await db
        .update(licenses)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(licenses.id, license.id));
      return reply.status(403).send({ error: "License expired" });
    }

    // Check feature
    const features = license.features as LicenseFeatures;
    if (!features[feature]) {
      return reply.status(403).send({ error: `Feature "${feature}" not available in your plan` });
    }
  };
}
