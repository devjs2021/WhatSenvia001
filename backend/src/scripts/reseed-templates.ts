import { db } from "../config/database.js";
import { botFlows } from "../infrastructure/database/schema/bot-flows.js";
import { eq } from "drizzle-orm";
import { seedTemplates } from "../modules/bot-builder/services/seed-templates.js";

async function reseed() {
  console.log("Deleting old templates...");
  await db.delete(botFlows).where(eq(botFlows.isTemplate, true));
  console.log("Seeding new templates...");
  await seedTemplates();
  process.exit(0);
}

reseed().catch((err) => {
  console.error("Reseed failed:", err);
  process.exit(1);
});
