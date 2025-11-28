/**
 * EncryptionService Unit Tests
 */

import { encryptionService } from '../../../src/services/encryptionService';

describe('EncryptionService', () => {
  // Set up test encryption key
  beforeAll(() => {
    process.env['ENCRYPTION_KEY'] = 'a'.repeat(64); // 32 bytes in hex
    process.env['HASH_SALT'] = 'test-hash-salt';
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'Test SSN: 123-45-6789';
      
      const encrypted = encryptionService.encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(plaintext.length);

      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should return empty string for empty input', () => {
      expect(encryptionService.encrypt('')).toBe('');
      expect(encryptionService.decrypt('')).toBe('');
    });

    it('should handle special characters', () => {
      const plaintext = '特殊文字 & <script>alert("xss")</script>';
      
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'Same text';
      
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // Both should decrypt to the same value
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'A'.repeat(10000);
      
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted strings', () => {
      const encrypted = encryptionService.encrypt('test');
      expect(encryptionService.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain strings', () => {
      expect(encryptionService.isEncrypted('plain text')).toBe(false);
      expect(encryptionService.isEncrypted('123-45-6789')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(encryptionService.isEncrypted('')).toBe(false);
    });

    it('should return false for invalid base64', () => {
      expect(encryptionService.isEncrypted('not-valid-base64!')).toBe(false);
    });
  });

  describe('hash', () => {
    it('should hash a value consistently', () => {
      const value = 'test-value';
      
      const hash1 = encryptionService.hash(value);
      const hash2 = encryptionService.hash(value);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different values', () => {
      const hash1 = encryptionService.hash('value1');
      const hash2 = encryptionService.hash('value2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should return empty string for empty input', () => {
      expect(encryptionService.hash('')).toBe('');
    });

    it('should produce a hex string', () => {
      const hash = encryptionService.hash('test');
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });
  });

  describe('mask', () => {
    it('should mask SSN correctly', () => {
      expect(encryptionService.mask('123-45-6789', 'ssn')).toBe('***-**-6789');
      expect(encryptionService.mask('123456789', 'ssn')).toBe('***-**-6789');
    });

    it('should mask EIN correctly', () => {
      expect(encryptionService.mask('12-3456789', 'ein')).toBe('**-***6789');
      expect(encryptionService.mask('123456789', 'ein')).toBe('**-***6789');
    });

    it('should mask phone correctly', () => {
      expect(encryptionService.mask('(555) 123-4567', 'phone')).toBe('(***) ***-4567');
      expect(encryptionService.mask('5551234567', 'phone')).toBe('(***) ***-4567');
    });

    it('should mask email correctly', () => {
      expect(encryptionService.mask('john.doe@example.com', 'email')).toBe('j***@example.com');
      expect(encryptionService.mask('a@b.com', 'email')).toBe('a***@b.com');
    });

    it('should mask account number correctly', () => {
      expect(encryptionService.mask('1234567890', 'account')).toBe('****7890');
    });

    it('should handle short values', () => {
      expect(encryptionService.mask('123', 'ssn')).toBe('***-**-****');
      expect(encryptionService.mask('12', 'phone')).toBe('(***) ***-****');
    });

    it('should handle empty values', () => {
      expect(encryptionService.mask('', 'ssn')).toBe('');
    });
  });

  describe('generateToken', () => {
    it('should generate tokens of specified length', () => {
      const token16 = encryptionService.generateToken(16);
      const token32 = encryptionService.generateToken(32);
      
      expect(token16.length).toBe(32); // hex is 2x byte length
      expect(token32.length).toBe(64);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(encryptionService.generateToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should generate hex strings', () => {
      const token = encryptionService.generateToken();
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });

  describe('generatePassword', () => {
    it('should generate passwords of specified length', () => {
      const password = encryptionService.generatePassword(20);
      expect(password.length).toBe(20);
    });

    it('should generate complex passwords', () => {
      const password = encryptionService.generatePassword(32);
      
      // Should contain variety of characters
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
    });

    it('should default to 16 characters', () => {
      const password = encryptionService.generatePassword();
      expect(password.length).toBe(16);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate 64-character hex string (32 bytes)', () => {
      const key = encryptionService.generateEncryptionKey();
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = encryptionService.generateEncryptionKey();
      const key2 = encryptionService.generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('encryptFields and decryptFields', () => {
    it('should encrypt specified fields in an object', () => {
      const obj = {
        name: 'John Doe',
        ssn: '123-45-6789',
        ein: '12-3456789',
        email: 'john@example.com',
      };

      const encrypted = encryptionService.encryptFields(obj, ['ssn', 'ein']);
      
      expect(encrypted.name).toBe('John Doe');
      expect(encrypted.email).toBe('john@example.com');
      expect(encrypted.ssn).not.toBe('123-45-6789');
      expect(encrypted.ein).not.toBe('12-3456789');
      expect(encryptionService.isEncrypted(encrypted.ssn as string)).toBe(true);
      expect(encryptionService.isEncrypted(encrypted.ein as string)).toBe(true);
    });

    it('should decrypt specified fields in an object', () => {
      const obj = {
        name: 'John Doe',
        ssn: '123-45-6789',
        ein: '12-3456789',
      };

      const encrypted = encryptionService.encryptFields(obj, ['ssn', 'ein']);
      const decrypted = encryptionService.decryptFields(encrypted, ['ssn', 'ein']);
      
      expect(decrypted.ssn).toBe('123-45-6789');
      expect(decrypted.ein).toBe('12-3456789');
      expect(decrypted.name).toBe('John Doe');
    });

    it('should handle null and undefined fields', () => {
      const obj = {
        name: 'John',
        ssn: null as string | null,
        ein: undefined as string | undefined,
      };

      const encrypted = encryptionService.encryptFields(obj, ['ssn', 'ein']);
      expect(encrypted.ssn).toBeNull();
      expect(encrypted.ein).toBeUndefined();
    });
  });
});

