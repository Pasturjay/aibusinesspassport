import crypto from "crypto";

/**
 * Field-Level AES-256-GCM Encryption Engine.
 * Used to protect PII and sensitive fields (NIN, TIN, financials) at rest.
 */

const ALGORITHM = "aes-256-gcm";
const DEFAULT_KEY_HEX = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 32-byte key

function getEncryptionKey(): Buffer {
  const envKey = process.env.FIELD_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || DEFAULT_KEY_HEX;
  return Buffer.from(envKey.slice(0, 64), "hex");
}

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string;         // Base64
  authTag: string;    // Base64
}

export function encryptField(plainText: string): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag().toString("base64");

  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    authTag,
  };
}

export function decryptField(payload: EncryptedPayload): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(payload.ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
