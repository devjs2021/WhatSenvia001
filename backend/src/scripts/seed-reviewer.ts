import bcrypt from "bcryptjs";
import { db } from "../config/database.js";
import { users } from "../infrastructure/database/schema/users.js";
import { licenses } from "../infrastructure/database/schema/licenses.js";
import { LICENSE_PLANS } from "../infrastructure/database/schema/licenses.js";
import { eq, sql } from "drizzle-orm";

async function seedReviewer() {
  const email = process.env.REVIEWER_EMAIL;
  const password = process.env.REVIEWER_PASSWORD;
  const name = "Meta Reviewer";

  if (!email || !password) {
    console.error("REVIEWER_EMAIL and REVIEWER_PASSWORD env vars are required");
    process.exit(1);
  }

  console.log(`Checking if reviewer exists: ${email}...`);

  // Ensure column exists (fallback if db:push wasn't run)
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) UNIQUE`);
  } catch (err) {
    // Ignore error if it already exists or other issues
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing.length > 0) {
    console.log("Reviewer already exists. Updating password and role...");
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.update(users)
      .set({ 
        password: hashedPassword,
        role: "admin",
        isActive: true 
      })
      .where(eq(users.email, email));
  } else {
    console.log("Creating new Meta Reviewer account...");
    const hashedPassword = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      company: "Meta Review Team",
      role: "admin",
      isActive: true,
    }).returning({ id: users.id });

    // Give them a pro license
    const preset = LICENSE_PLANS.pro;
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year

    await db.insert(licenses).values({
      userId: user.id,
      plan: "pro",
      status: "active",
      startsAt: new Date(),
      expiresAt,
      maxSessions: preset.maxSessions,
      maxContacts: preset.maxContacts,
      maxCampaignsPerDay: preset.maxCampaignsPerDay,
      maxMessagesPerDay: preset.maxMessagesPerDay,
      features: preset.features,
      notes: "License for Meta Reviewer",
    });

    console.log("Meta Reviewer account created successfully.");
  }

  process.exit(0);
}

seedReviewer().catch((err) => {
  console.error("Failed to seed reviewer:", err);
  process.exit(1);
});
