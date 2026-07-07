import bcrypt from "bcryptjs";
import { db } from "../config/database.js";
import { users } from "../infrastructure/database/schema/users.js";
import { licenses } from "../infrastructure/database/schema/licenses.js";
import { eq } from "drizzle-orm";

const PASSWORD = "Bagon2025*";

const BAGON_USERS = [
  { email: "r.corona@bagon.mx",           name: "Rosaura Corona Mendoza",    maxSessions: 4 },
  { email: "b.galvez@bagon.mx",            name: "Benjamín Gálvez Hidalgo",   maxSessions: 3 },
  { email: "jc.dehoyosgonzalez@bagon.mx", name: "José Carlos De Hoyos",      maxSessions: 3 },
];

const FEATURES = {
  campaigns: true,
  botBuilder: true,
  chatLive: true,
  polls: true,
  scheduledCampaigns: true,
  contactExtraction: true,
  import: true,
  reports: true,
  templates: true,
  campaignControl: true,
};

async function seedBagonUsers() {
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);

  // Get admin id for createdBy field
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  for (const u of BAGON_USERS) {
    const existing = await db.select().from(users).where(eq(users.email, u.email)).limit(1);

    if (existing.length > 0) {
      console.log(`⚠  Ya existe: ${u.email} — omitido`);
      continue;
    }

    const [user] = await db
      .insert(users)
      .values({
        email: u.email,
        password: hashedPassword,
        name: u.name,
        company: "Bagon",
        role: "user",
        isActive: true,
      })
      .returning();

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year

    await db.insert(licenses).values({
      userId: user.id,
      plan: "enterprise",
      status: "active",
      startsAt: new Date(),
      expiresAt,
      maxSessions: u.maxSessions,
      maxContacts: 50000,
      maxCampaignsPerDay: 100,
      maxMessagesPerDay: 50000,
      features: FEATURES,
      notes: `Cliente Bagon — ${u.maxSessions} cuentas Meta`,
      createdBy: admin?.id || user.id,
    });

    console.log(`✓  Creado: ${u.name} <${u.email}> — ${u.maxSessions} sesiones Meta — licencia 1 año`);
  }

  console.log("\n--- Credenciales ---");
  for (const u of BAGON_USERS) {
    console.log(`${u.email}  /  ${PASSWORD}`);
  }
  console.log("--------------------\n");

  process.exit(0);
}

seedBagonUsers().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
