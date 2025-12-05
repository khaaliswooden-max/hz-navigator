/**
 * Encryption Service
 * 
 * Provides encryption/decryption for sensitive fields like:
 * - Social Security Numbers (SSN)
 * - Tax IDs (EIN)
 * - Bank account numbers
 * - Other PII
 * 
 * Uses AES-256-GCM encryption with key derived from environment variable.
 */

import crypto from 'crypto';

// ===== Configuration =====

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const TAG_LENGTH = 16; // GCM auth tag length
const SALT_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits for AES-256

// Get encryption key from environment
const getEncryptionKey = (): Buffer => {
  const key = process.env['ENCRYPTION_KEY'];
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // If key is provided as hex string (64 chars for 32 bytes)
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }

  // If key is provided as base64 (44 chars for 32 bytes)
  if (key.length === 44) {
    return Buffer.from(key, 'base64');
  }

  // Derive key from passphrase using PBKDF2
  const salt = process.env['ENCRYPTION_SALT'] || 'hz-navigator-default-salt';
  return crypto.pbkdf2Sync(key, salt, 100000, KEY_LENGTH, 'sha256');
};

// ===== Types =====

interface EncryptedData {
  iv: string;      // Initialization vector (hex)
  tag: string;     // Authentication tag (hex)
  data: string;    // Encrypted data (hex)
  version: number; // Encryption version for future upgrades
}

// ===== Encryption Service =====

export const encryptionService = {
  /**
   * Encrypt a string value
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    try {
      const key = getEncryptionKey();
      const iv = crypto.randomBytes(IV_LENGTH);
      
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      const result: EncryptedData = {
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        data: encrypted,
        version: 1,
      };

      // Return as base64-encoded JSON for storage
      return Buffer.from(JSON.stringify(result)).toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  },

  /**
   * Decrypt an encrypted string
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) return ciphertext;

    try {
      // Parse the encrypted data
      const json = Buffer.from(ciphertext, 'base64').toString('utf8');
      const { iv, tag, data, version } = JSON.parse(json) as EncryptedData;

      if (version !== 1) {
        throw new Error(`Unsupported encryption version: ${version}`);
      }

      const key = getEncryptionKey();
      
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  },

  /**
   * Check if a value is encrypted
   */
  isEncrypted(value: string): boolean {
    if (!value) return false;

    try {
      const json = Buffer.from(value, 'base64').toString('utf8');
      const parsed = JSON.parse(json);
      return (
        typeof parsed === 'object' &&
        'iv' in parsed &&
        'tag' in parsed &&
        'data' in parsed &&
        'version' in parsed
      );
    } catch {
      return false;
    }
  },

  /**
   * Hash a value (one-way, for comparison)
   * Used for values that need to be searchable but not decrypted
   */
  hash(value: string): string {
    if (!value) return value;
    
    const salt = process.env['HASH_SALT'] || 'hz-navigator-hash-salt';
    return crypto
      .createHmac('sha256', salt)
      .update(value)
      .digest('hex');
  },

  /**
   * Mask a sensitive value for display
   * e.g., SSN: ***-**-1234
   */
  mask(value: string, type: 'ssn' | 'ein' | 'phone' | 'email' | 'account'): string {
    if (!value) return value;

    switch (type) {
      case 'ssn':
        // Show last 4 digits: ***-**-1234
        return value.length >= 4
          ? `***-**-${value.slice(-4)}`
          : '***-**-****';

      case 'ein':
        // Show last 4 digits: **-***1234
        return value.length >= 4
          ? `**-***${value.slice(-4)}`
          : '**-*******';

      case 'phone':
        // Show last 4 digits: (***) ***-1234
        return value.length >= 4
          ? `(***) ***-${value.slice(-4)}`
          : '(***) ***-****';

      case 'email': {
        // Show first char and domain: j***@example.com
        const [local, domain] = value.split('@');
        if (local && domain) {
          return `${local[0]}***@${domain}`;
        }
        return '***@***.***';
      }

      case 'account':
        // Show last 4 digits: ****1234
        return value.length >= 4
          ? `****${value.slice(-4)}`
          : '********';

      default:
        return '********';
    }
  },

  /**
   * Generate a secure random token
   */
  generateToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  },

  /**
   * Generate a secure random password
   */
  generatePassword(length = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const bytes = crypto.randomBytes(length);
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset[bytes[i] % charset.length];
    }
    
    return password;
  },

  /**
   * Generate an encryption key (for initial setup)
   */
  generateEncryptionKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  },

  /**
   * Encrypt an object's sensitive fields
   */
  encryptFields<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[]
  ): T {
    const result = { ...obj };
    
    for (const field of fields) {
      const value = result[field];
      if (typeof value === 'string' && value) {
        (result[field] as unknown) = this.encrypt(value);
      }
    }
    
    return result;
  },

  /**
   * Decrypt an object's sensitive fields
   */
  decryptFields<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[]
  ): T {
    const result = { ...obj };
    
    for (const field of fields) {
      const value = result[field];
      if (typeof value === 'string' && this.isEncrypted(value)) {
        (result[field] as unknown) = this.decrypt(value);
      }
    }
    
    return result;
  },

  /**
   * Rotate encryption key
   * Re-encrypts all data with a new key
   */
  async rotateKey(
    oldKey: string,
    newKey: string,
    tableName: string,
    columnName: string,
    idColumn = 'id'
  ): Promise<{ success: number; failed: number }> {
    // This would be implemented as a database migration
    // For now, return a placeholder
    console.info(`Key rotation for ${tableName}.${columnName} would be performed here`);
    console.info(`Old key: ${oldKey.substring(0, 8)}...`);
    console.info(`New key: ${newKey.substring(0, 8)}...`);
    console.info(`ID column: ${idColumn}`);
    
    return { success: 0, failed: 0 };
  },
};

// ===== Sensitive Field Definitions =====

export const SENSITIVE_FIELDS = {
  user: ['ssn', 'tax_id', 'bank_account'],
  business: ['ein', 'bank_account', 'ssn_owner'],
  document: ['content_hash'],
} as const;

export default encryptionService;

