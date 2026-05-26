/**
 * Migration: Clean up chat_messages records where phone is not a real phone number.
 * 
 * Real phone numbers are typically 10-12 digits (country code + number).
 * Meta internal IDs (phone_number_id, waba_id) are 13+ digits.
 * 
 * This script removes records where the phone field:
 * - Has more than 12 digits (internal IDs like meta_phone_number_id)
 * - Does not match a valid phone pattern
 * 
 * Usage:
 *   npx tsx scripts/cleanup-invalid-chat-phones.ts
 * 
 * To target a specific database:
 *   DATABASE_URL=postgresql://user:pass@host:5432/db npx tsx scripts/cleanup-invalid-chat-phones.ts
 */

import { db } from "../src/config/database.js";
import { sql } from "drizzle-orm";

async function cleanup() {
  console.log("🔍 Scanning for invalid phone numbers in chat_messages...");
  console.log(`   Database: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, "//user:pass@") || "from .env"}`);

  // Find all records where phone is longer than 12 digits (internal IDs)
  // or doesn't match a valid phone pattern
  const invalidRecords = await db.execute(sql`
    SELECT id, phone, session_id, LEFT(content, 80) as content_preview, created_at
    FROM chat_messages
    WHERE LENGTH(phone) > 12
       OR phone ~ '^[0-9]{13,}$'
    ORDER BY created_at DESC
  `);

  const rows = invalidRecords.rows as any[];
  console.log(`\n📊 Found ${rows.length} records with invalid phone numbers:`);
  
  for (const row of rows) {
    console.log(`   - Phone: ${row.phone} (${row.phone?.length || 0} digits) | Session: ${row.session_id?.substring(0, 8)}... | Date: ${row.created_at?.substring(0, 10)} | Msg: "${row.content_preview?.substring(0, 40)}"`);
  }

  if (rows.length === 0) {
    console.log("\n✅ No invalid records found. Nothing to clean up.");
    process.exit(0);
  }

  console.log("\n⚠️  About to DELETE these records. Press Ctrl+C to cancel.");
  console.log("   Continuing in 3 seconds...");
  await new Promise(r => setTimeout(r, 3000));

  // Delete the invalid records
  const result = await db.execute(sql`
    DELETE FROM chat_messages
    WHERE LENGTH(phone) > 12
       OR phone ~ '^[0-9]{13,}$'
  `);

  console.log(`\n✅ Deleted ${result.rowCount || rows.length} records with invalid phone numbers.`);
  console.log("💡 New messages will now only show real phone numbers from Meta webhooks or test-send.");
  process.exit(0);
}

cleanup().catch((err) => {
  console.error("❌ Error during cleanup:", err);
  process.exit(1);
});
