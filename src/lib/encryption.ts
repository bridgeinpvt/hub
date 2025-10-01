import crypto from "crypto";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // For GCM, this is always 16
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Get encryption key from environment or generate a default (for development)
 */
function getEncryptionKey(): string {
  const envKey = process.env.ASSET_ENCRYPTION_KEY;
  if (envKey) {
    return envKey;
  }

  // For development only - in production, this should be set in environment
  const defaultKey = "dev-key-change-in-production-nocage-asset-encryption-key-2024";
  console.warn("[Encryption] Using default encryption key. Set ASSET_ENCRYPTION_KEY in production!");
  return defaultKey;
}

/**
 * Derive key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha512");
}

/**
 * Encrypt an asset link (fixed for modern Node.js)
 */
export function encryptAssetLink(assetLink: string): string {
  try {
    const password = getEncryptionKey();
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(assetLink, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Combine salt, iv, and encrypted data
    const combined = salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;
    return `ENCRYPTED:${combined}`;
  } catch (error) {
    console.error("[Encryption] Failed to encrypt asset link:", error);
    throw new Error("Failed to encrypt asset link");
  }
}

/**
 * Decrypt an asset link (with emergency bypass)
 */
export function decryptAssetLink(encryptedData: string): string {
  try {
    // EMERGENCY FIX: If data is not encrypted, return as-is
    if (!encryptedData.startsWith('ENCRYPTED:')) {
      return encryptedData;
    }

    const combined = encryptedData.replace('ENCRYPTED:', '');
    const parts = combined.split(':');

    if (parts.length !== 3) {
      // For legacy encrypted data that can't be decrypted, return a placeholder
      console.warn("[Encryption] Legacy encrypted data detected, using emergency fallback");
      return "https://drive.google.com/file/d/LEGACY_ENCRYPTED_ASSET/view?usp=sharing";
    }

    const [saltHex, ivHex, encrypted] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const password = getEncryptionKey();
    const key = crypto.scryptSync(password, salt, 32);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[Encryption] Failed to decrypt asset link:", error);
    // Emergency fallback for any decryption errors
    return "https://drive.google.com/file/d/DECRYPTION_ERROR_CONTACT_SUPPORT/view?usp=sharing";
  }
}

/**
 * Legacy decryption for backward compatibility
 * Simplified EVP_BytesToKey implementation
 */
function legacyDecryptAssetLink(encryptedData: string): string {
  try {
    const encrypted = encryptedData.replace('ENCRYPTED:', '');
    const password = getEncryptionKey();

    // Simple EVP_BytesToKey equivalent for createDecipher compatibility
    const md5_1 = crypto.createHash('md5').update(password).digest();
    const md5_2 = crypto.createHash('md5').update(md5_1).update(password).digest();
    const md5_3 = crypto.createHash('md5').update(md5_2).update(password).digest();

    const key = Buffer.concat([md5_1, md5_2]); // 32 bytes for AES-256
    const iv = md5_3; // 16 bytes for CBC

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("Legacy decryption also failed: " + errorMessage);
  }
}

/**
 * Check if a string appears to be encrypted
 */
export function isEncrypted(data: string): boolean {
  return data.startsWith('ENCRYPTED:');
}

/**
 * Get a safe display version of asset link (for debugging/logging)
 */
export function getSafeAssetLink(assetLink: string): string {
  if (!assetLink) return "";

  if (isEncrypted(assetLink)) {
    return "[ENCRYPTED_ASSET_LINK]";
  }

  // For plain URLs, show domain only
  try {
    const url = new URL(assetLink);
    return `[ASSET: ${url.hostname}]`;
  } catch {
    return "[ASSET_LINK]";
  }
}

/**
 * Migrate plain text asset link to encrypted version
 */
export function migrateAssetLink(plainAssetLink: string): string {
  if (!plainAssetLink) return "";

  if (isEncrypted(plainAssetLink)) {
    return plainAssetLink; // Already encrypted
  }

  return encryptAssetLink(plainAssetLink);
}