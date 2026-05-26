import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "../../../config/database.js";
import { users } from "../../../infrastructure/database/schema/users.js";
import { licenses } from "../../../infrastructure/database/schema/licenses.js";
import { LICENSE_PLANS } from "../../../infrastructure/database/schema/licenses.js";
import { refreshTokens } from "../../../infrastructure/database/schema/refresh-tokens.js";
import { eq, and, lt } from "drizzle-orm";
import type { RegisterInput, LoginInput, GoogleAuthInput, ResetPasswordInput } from "../schemas/auth.schema.js";
import { env } from "../../../config/env.js";
import { sendPasswordResetCode } from "../../../infrastructure/email/email.service.js";

const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const RESET_CODE_EXPIRY_MINUTES = 15;

// In-memory store for reset codes (in production, use Redis)
const resetCodes = new Map<string, { code: string; expiresAt: Date }>();

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

    if (existing.length > 0) {
      throw new Error("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        password: hashedPassword,
        name: input.name,
        company: input.company,
        role: "user",
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        company: users.company,
        role: users.role,
        createdAt: users.createdAt,
      });

    // Auto-create demo license for self-registered users
    const preset = LICENSE_PLANS.demo;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + preset.durationDays);

    await db.insert(licenses).values({
      userId: user.id,
      plan: "demo",
      status: "active",
      startsAt: new Date(),
      expiresAt,
      maxSessions: preset.maxSessions,
      maxContacts: preset.maxContacts,
      maxCampaignsPerDay: preset.maxCampaignsPerDay,
      maxMessagesPerDay: preset.maxMessagesPerDay,
      features: preset.features,
      notes: "Auto-created demo license",
    });

    return user;
  }

  async login(input: LoginInput) {
    const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("Account is deactivated");
    }

    const validPassword = await bcrypt.compare(input.password, user.password);
    if (!validPassword) {
      throw new Error("Invalid credentials");
    }

    // Get active license info
    const [license] = await db
      .select()
      .from(licenses)
      .where(and(eq(licenses.userId, user.id), eq(licenses.status, "active")))
      .limit(1);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      role: user.role,
      license: license
        ? {
            plan: license.plan,
            status: license.status,
            expiresAt: license.expiresAt,
            features: license.features,
          }
        : null,
    };
  }

  async googleAuth(input: GoogleAuthInput) {
    // Verify Google credential token
    let payload: any;
    try {
      // Verify with Google's tokeninfo endpoint
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${input.credential}`
      );
      if (!response.ok) {
        throw new Error("Invalid Google credential");
      }
      payload = await response.json();
    } catch (err: any) {
      throw new Error("Invalid Google credential: " + err.message);
    }

    const { email, name, sub: googleId } = payload;

    if (!email) {
      throw new Error("Google account must have an email");
    }

    // Only allow @gmail.com accounts
    if (!email.endsWith("@gmail.com")) {
      throw new Error("Only @gmail.com accounts are allowed");
    }

    // Determine if this email should be admin
    const adminEmails = env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const isAdminEmail = adminEmails.includes(email.toLowerCase());

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      if (!existingUser.isActive) {
        throw new Error("Account is deactivated");
      }

      // Update googleId if not set
      if (!existingUser.facebookId) {
        await db
          .update(users)
          .set({ facebookId: googleId, updatedAt: new Date() })
          .where(eq(users.id, existingUser.id));
      }

      // Get active license
      const [license] = await db
        .select()
        .from(licenses)
        .where(and(eq(licenses.userId, existingUser.id), eq(licenses.status, "active")))
        .limit(1);

      return {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          company: existingUser.company,
          role: existingUser.role,
          license: license
            ? {
                plan: license.plan,
                status: license.status,
                expiresAt: license.expiresAt,
                features: license.features,
              }
            : null,
        },
        isNewUser: false,
      };
    }

    // Create new user
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name: name || email.split("@")[0],
        role: isAdminEmail ? "admin" : "user",
        facebookId: googleId,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        company: users.company,
        role: users.role,
        createdAt: users.createdAt,
      });

    // Auto-create demo license
    const preset = LICENSE_PLANS.demo;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + preset.durationDays);

    await db.insert(licenses).values({
      userId: newUser.id,
      plan: "demo",
      status: "active",
      startsAt: new Date(),
      expiresAt,
      maxSessions: preset.maxSessions,
      maxContacts: preset.maxContacts,
      maxCampaignsPerDay: preset.maxCampaignsPerDay,
      maxMessagesPerDay: preset.maxMessagesPerDay,
      features: preset.features,
      notes: "Auto-created demo license via Google OAuth",
    });

    return {
      user: {
        ...newUser,
        license: {
          plan: "demo",
          status: "active",
          expiresAt,
          features: preset.features,
        },
      },
      isNewUser: true,
    };
  }

  async forgotPassword(email: string) {
    // Check if user exists (don't reveal if they don't)
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return; // Don't reveal if email exists
    }

    // Check if user registered with Google (no password)
    if (user.facebookId && !user.password) {
      return; // Google users can't reset password
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + RESET_CODE_EXPIRY_MINUTES);

    // Store code
    resetCodes.set(email, { code, expiresAt });

    // Send email
    await sendPasswordResetCode(email, code);
  }

  async resetPassword(input: ResetPasswordInput) {
    const stored = resetCodes.get(input.email);
    if (!stored) {
      throw new Error("No reset code requested or code expired");
    }

    if (new Date() > stored.expiresAt) {
      resetCodes.delete(input.email);
      throw new Error("Reset code has expired");
    }

    if (stored.code !== input.code) {
      throw new Error("Invalid reset code");
    }

    // Update password
    const hashedPassword = await bcrypt.hash(input.password, 12);
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.email, input.email));

    // Clean up
    resetCodes.delete(input.email);
  }

  async getProfile(userId: string) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        company: users.company,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return null;

    // Include active license
    const [license] = await db
      .select()
      .from(licenses)
      .where(and(eq(licenses.userId, userId), eq(licenses.status, "active")))
      .limit(1);

    return {
      ...user,
      license: license
        ? {
            id: license.id,
            plan: license.plan,
            status: license.status,
            expiresAt: license.expiresAt,
            features: license.features,
            maxSessions: license.maxSessions,
            maxContacts: license.maxContacts,
            maxMessagesPerDay: license.maxMessagesPerDay,
            maxCampaignsPerDay: license.maxCampaignsPerDay,
          }
        : null,
    };
  }

  async createRefreshToken(userId: string, userAgent?: string): Promise<string> {
    const token = crypto.randomBytes(40).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await db.insert(refreshTokens).values({
      userId,
      token,
      userAgent: userAgent?.substring(0, 500),
      expiresAt,
    });

    return token;
  }

  async refreshAccessToken(token: string) {
    const [record] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token))
      .limit(1);

    if (!record) {
      throw new Error("Invalid refresh token");
    }

    if (new Date() > record.expiresAt) {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, record.id));
      throw new Error("Refresh token expired");
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, record.userId))
      .limit(1);

    if (!user || !user.isActive) {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, record.userId));
      throw new Error("User not found or deactivated");
    }

    // Rotate: delete old token, create new one
    await db.delete(refreshTokens).where(eq(refreshTokens.id, record.id));
    const newToken = await this.createRefreshToken(user.id);

    return { user, newRefreshToken: newToken };
  }

  async revokeRefreshToken(token: string) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async revokeAllUserTokens(userId: string) {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  async cleanupExpiredTokens() {
    await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
  }

  async deleteByFacebookId(facebookId: string) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.facebookId, facebookId))
      .limit(1);

    if (!user) {
      console.log(`Data deletion requested for unknown Facebook ID: ${facebookId}`);
      return null;
    }

    await db.delete(users).where(eq(users.id, user.id));
    return user.id;
  }
}
