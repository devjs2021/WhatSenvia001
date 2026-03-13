import bcrypt from "bcryptjs";
import { db } from "../config/database.js";
import { users } from "../infrastructure/database/schema/users.js";
import { licenses } from "../infrastructure/database/schema/licenses.js";
import { LICENSE_PLANS } from "../infrastructure/database/schema/licenses.js";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@whatsenvia.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123456";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administrador";

async function seedAdmin() {
  console.log("Checking for existing admin...");

  const existing = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);

  if (existing.length > 0) {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);

    // Ensure role is admin
    if (existing[0].role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, existing[0].id));
      console.log("Updated role to admin");
    }

    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const [admin] = await db
    .insert(users)
    .values({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      role: "admin",
      isActive: true,
    })
    .returning();

  console.log(`Admin created: ${admin.email} (${admin.id})`);

  // Create enterprise license for admin (unlimited)
  const preset = LICENSE_PLANS.enterprise;
  await db.insert(licenses).values({
    userId: admin.id,
    plan: "enterprise",
    status: "active",
    startsAt: new Date(),
    expiresAt: null, // unlimited
    maxSessions: 999,
    maxContacts: 999999,
    maxCampaignsPerDay: 9999,
    maxMessagesPerDay: 999999,
    features: preset.features,
    notes: "Admin license - unlimited",
    createdBy: admin.id,
  });

  console.log("Enterprise license created (unlimited)");
  console.log("\n--- Login credentials ---");
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log("-------------------------\n");

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
