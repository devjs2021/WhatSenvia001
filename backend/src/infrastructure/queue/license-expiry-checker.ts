import { db } from "../../config/database.js";
import { licenses } from "../database/schema/licenses.js";
import { users } from "../database/schema/users.js";
import { sendLicenseExpiringEmail } from "../email/email.service.js";
import { logger } from "../../config/logger.js";
import { eq, and, between } from "drizzle-orm";

async function checkExpiringLicenses() {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sixDaysFromNow = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);

    const expiring = await db
      .select({
        userId: licenses.userId,
        plan: licenses.plan,
        expiresAt: licenses.expiresAt,
      })
      .from(licenses)
      .where(
        and(
          eq(licenses.status, "active"),
          between(licenses.expiresAt, sixDaysFromNow, sevenDaysFromNow)
        )
      );

    for (const license of expiring) {
      if (!license.expiresAt) continue;
      const [user] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, license.userId))
        .limit(1);

      if (user) {
        await sendLicenseExpiringEmail(user.email, user.name, license.plan, license.expiresAt);
        logger.info({ userId: license.userId, plan: license.plan }, "License expiry email sent");
      }
    }
  } catch (err: any) {
    logger.error({ error: err.message }, "Error checking expiring licenses");
  }
}

export function startLicenseExpiryChecker() {
  setTimeout(() => checkExpiringLicenses().catch(() => {}), 60000);
  setInterval(() => checkExpiringLicenses().catch(() => {}), 24 * 60 * 60 * 1000);
  logger.info("License expiry checker started (daily)");
}
