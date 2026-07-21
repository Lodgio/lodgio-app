import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";

function deriveKey(): Buffer {
  return scryptSync(env.dbEncryptionKey(), "lodgio-salt", 32);
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const key = deriveKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptToken(ciphertext: string): string {
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const key = deriveKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
