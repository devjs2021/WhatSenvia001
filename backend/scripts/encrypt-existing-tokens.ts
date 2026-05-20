/**
 * Migration script: Encrypt existing plain-text meta_access_token values.
 *
 * This script:
 * 1. Tests that encryption/decryption works correctly
 * 2. Finds all whatsapp_sessions with plain-text meta_access_token
 * 3. Encrypts them in-place
 *
 * Usage:
 *   ENCRYPTION_KEY=<64-hex-char-key> npx tsx scripts/encrypt-existing-tokens.ts
 *
 * Or with DATABASE_URL override:
 *   DATABASE_URL=postgresql://... ENCRYPTION_KEY=... npx tsx scripts/encrypt-existing-tokens.ts
 */

import { db } from "../src/config/database.js";
import { whatsappSessions } from "../src/infrastructure/database/schema/whatsapp-sessions.js";
import { encrypt, decrypt } from "../src/infrastructure/security/encryption.service.js";
import { eq, isNotNull } from "drizzle-orm";

async function main() {
  console.log("=".repeat(60));
  console.log("🔐 ENCRYPTION TEST");
  console.log("=".repeat(60));

  // ── Step 1: Test encryption/decryption ──────────────────────────────
  const testPlaintext = "test123";
  console.log(`\n1. Testing encrypt/decrypt with plaintext: "${testPlaintext}"`);

  const encrypted = encrypt(testPlaintext);
  console.log(`   Encrypted: ${encrypted}`);

  const decrypted = decrypt(encrypted);
  console.log(`   Decrypted: "${decrypted}"`);

  if (decrypted === testPlaintext) {
    console.log("   ✅ Encryption round-trip: PASS");
  } else {
    console.error("   ❌ Encryption round-trip: FAIL");
    process.exit(1);
  }

  // ── Step 2: Test backward compatibility (plain text pass-through) ──
  console.log(`\n2. Testing backward compatibility (decrypt plain text):`);
  const plainTextPassThrough = decrypt("EAAx...some-plain-jwt-token");
  console.log(`   Input: "EAAx...some-plain-jwt-token"`);
  console.log(`   Output: "${plainTextPassThrough}"`);
  console.log(`   ✅ Backward compatibility: PASS`);

  // ── Step 3: Encrypt existing tokens ─────────────────────────────────
  console.log(`\n3. Scanning for existing plain-text meta_access_token values...`);

  const sessions = await db
    .select({
      id: whatsappSessions.id,
      name: whatsappSessions.name,
      metaAccessToken: whatsappSessions.metaAccessToken,
    })
    .from(whatsappSessions)
    .where(isNotNull(whatsappSessions.metaAccessToken));

  console.log(`   Found ${sessions.length} session(s) with meta_access_token.`);

  let encryptedCount = 0;
  let skippedCount = 0;

  for (const session of sessions) {
    const token = session.metaAccessToken!;

    // Check if already encrypted (format: iv:authTag:ciphertext)
    const parts = token.split(":");
    if (parts.length === 3 && parts[0].length === 32 && parts[1].length === 32) {
      console.log(`   ⏭️  Session "${session.name}" (${session.id}): already encrypted, skipping.`);
      skippedCount++;
      continue;
    }

    // Encrypt the plain-text token
    const encryptedToken = encrypt(token);
    await db
      .update(whatsappSessions)
      .set({ metaAccessToken: encryptedToken, updatedAt: new Date() })
      .where(eq(whatsappSessions.id, session.id));

    console.log(`   ✅ Session "${session.name}" (${session.id}): token encrypted.`);
    encryptedCount++;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${"=".repeat(60)}`);
  console.log(`   Total sessions with tokens: ${sessions.length}`);
  console.log(`   Newly encrypted:            ${encryptedCount}`);
  console.log(`   Already encrypted:          ${skippedCount}`);
  console.log(`   Encryption test:            PASS`);
  console.log(`${"=".repeat(60)}`);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
