import crypto from "crypto";
import { env } from "../../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Returns true if encryption is configured (ENCRYPTION_KEY is set).
 */
function isEncryptionEnabled(): boolean {
  return !!env.ENCRYPTION_KEY;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * If ENCRYPTION_KEY is not configured, returns the plaintext as-is (no encryption).
 * Returns a string in the format: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!isEncryptionEnabled()) {
    return plaintext;
  }

  const key = Buffer.from(env.ENCRYPTION_KEY!, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");
  const ivHex = iv.toString("hex");

  return `${ivHex}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted with encrypt().
 * Expects format: iv:authTag:ciphertext
 * If the string doesn't have the encrypted format (no colons), returns it as-is (plain text).
 */
export function decrypt(encryptedData: string): string {
  if (!isEncryptionEnabled()) {
    return encryptedData;
  }

  const key = Buffer.from(env.ENCRYPTION_KEY!, "hex");
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    // Not encrypted, return as-is (backward compatibility with existing plain text data)
    return encryptedData;
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
