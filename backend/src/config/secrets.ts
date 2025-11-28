/**
 * Secrets Management Configuration
 * 
 * Provides secure access to sensitive configuration values.
 * Supports:
 * - Environment variables (development/staging)
 * - AWS Secrets Manager (production)
 * - Secret rotation tracking
 * 
 * IMPORTANT: Never commit secrets to git. Use .env files locally
 * and AWS Secrets Manager in production.
 */

import crypto from 'crypto';

// ===== Types =====

export interface SecretConfig {
  name: string;
  required: boolean;
  rotationDays?: number; // How often to rotate
  lastRotated?: Date;
}

export interface SecretsManagerConfig {
  provider: 'env' | 'aws';
  awsRegion?: string;
  awsSecretPrefix?: string;
}

// ===== Secret Definitions =====

const SECRET_DEFINITIONS: Record<string, SecretConfig> = {
  // JWT Configuration
  JWT_SECRET: {
    name: 'JWT_SECRET',
    required: true,
    rotationDays: 90, // Rotate quarterly
  },
  JWT_REFRESH_SECRET: {
    name: 'JWT_REFRESH_SECRET',
    required: false,
    rotationDays: 90,
  },

  // Database
  POSTGRES_PASSWORD: {
    name: 'POSTGRES_PASSWORD',
    required: true,
    rotationDays: 90,
  },

  // Encryption
  ENCRYPTION_KEY: {
    name: 'ENCRYPTION_KEY',
    required: true,
    rotationDays: 365, // Rotate annually (requires data migration)
  },
  ENCRYPTION_SALT: {
    name: 'ENCRYPTION_SALT',
    required: false,
  },
  HASH_SALT: {
    name: 'HASH_SALT',
    required: false,
  },

  // AWS (Production)
  AWS_ACCESS_KEY_ID: {
    name: 'AWS_ACCESS_KEY_ID',
    required: false,
    rotationDays: 90,
  },
  AWS_SECRET_ACCESS_KEY: {
    name: 'AWS_SECRET_ACCESS_KEY',
    required: false,
    rotationDays: 90,
  },
  AWS_S3_BUCKET: {
    name: 'AWS_S3_BUCKET',
    required: false,
  },

  // External APIs
  MAPBOX_ACCESS_TOKEN: {
    name: 'MAPBOX_ACCESS_TOKEN',
    required: false,
  },
  SBA_API_KEY: {
    name: 'SBA_API_KEY',
    required: false,
    rotationDays: 365,
  },

  // Email/Notifications
  SMTP_PASSWORD: {
    name: 'SMTP_PASSWORD',
    required: false,
    rotationDays: 90,
  },
  SENDGRID_API_KEY: {
    name: 'SENDGRID_API_KEY',
    required: false,
    rotationDays: 180,
  },

  // Session
  SESSION_SECRET: {
    name: 'SESSION_SECRET',
    required: false,
    rotationDays: 90,
  },
};

// ===== Environment Detection =====

const getEnvironment = (): 'development' | 'staging' | 'production' => {
  const env = process.env['NODE_ENV'];
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
};

// ===== Secrets Manager =====

class SecretsManager {
  private config: SecretsManagerConfig;
  private cache: Map<string, string> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.config = {
      provider: getEnvironment() === 'production' ? 'aws' : 'env',
      awsRegion: process.env['AWS_REGION'] || 'us-east-1',
      awsSecretPrefix: process.env['AWS_SECRET_PREFIX'] || 'hz-navigator/',
    };
  }

  /**
   * Get a secret value
   */
  async get(name: string): Promise<string | undefined> {
    // Check cache first
    const cached = this.getFromCache(name);
    if (cached !== undefined) return cached;

    let value: string | undefined;

    if (this.config.provider === 'aws') {
      value = await this.getFromAWS(name);
    } else {
      value = this.getFromEnv(name);
    }

    // Cache the value
    if (value !== undefined) {
      this.setCache(name, value);
    }

    return value;
  }

  /**
   * Get a required secret (throws if not found)
   */
  async getRequired(name: string): Promise<string> {
    const value = await this.get(name);
    if (!value) {
      throw new Error(`Required secret '${name}' is not configured`);
    }
    return value;
  }

  /**
   * Get from environment variables
   */
  private getFromEnv(name: string): string | undefined {
    return process.env[name];
  }

  /**
   * Get from AWS Secrets Manager
   * Note: In a real implementation, this would use the AWS SDK
   */
  private async getFromAWS(name: string): Promise<string | undefined> {
    // Placeholder for AWS Secrets Manager integration
    // In production, this would use @aws-sdk/client-secrets-manager
    
    console.info(`[Secrets] Would fetch ${this.config.awsSecretPrefix}${name} from AWS Secrets Manager`);
    
    // Fall back to environment variable
    return this.getFromEnv(name);

    /* Production implementation:
    const client = new SecretsManagerClient({ region: this.config.awsRegion });
    const command = new GetSecretValueCommand({
      SecretId: `${this.config.awsSecretPrefix}${name}`,
    });
    const response = await client.send(command);
    return response.SecretString;
    */
  }

  /**
   * Get from cache
   */
  private getFromCache(name: string): string | undefined {
    const expiry = this.cacheExpiry.get(name);
    if (expiry && expiry > Date.now()) {
      return this.cache.get(name);
    }
    // Cache expired
    this.cache.delete(name);
    this.cacheExpiry.delete(name);
    return undefined;
  }

  /**
   * Set cache value
   */
  private setCache(name: string, value: string): void {
    this.cache.set(name, value);
    this.cacheExpiry.set(name, Date.now() + this.CACHE_TTL);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Validate all required secrets are present
   */
  async validateSecrets(): Promise<{
    valid: boolean;
    missing: string[];
    warnings: string[];
  }> {
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const [name, config] of Object.entries(SECRET_DEFINITIONS)) {
      const value = await this.get(name);
      
      if (config.required && !value) {
        missing.push(name);
      }

      // Check for rotation warnings
      if (value && config.rotationDays && config.lastRotated) {
        const daysSinceRotation = Math.floor(
          (Date.now() - config.lastRotated.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceRotation >= config.rotationDays) {
          warnings.push(`${name} is due for rotation (${daysSinceRotation} days old)`);
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }

  /**
   * Get secret metadata
   */
  getSecretConfig(name: string): SecretConfig | undefined {
    return SECRET_DEFINITIONS[name];
  }

  /**
   * Generate a new secret value
   */
  generateSecret(type: 'jwt' | 'encryption' | 'session' | 'api_key'): string {
    switch (type) {
      case 'jwt':
        return crypto.randomBytes(64).toString('hex');
      case 'encryption':
        return crypto.randomBytes(32).toString('hex');
      case 'session':
        return crypto.randomBytes(48).toString('hex');
      case 'api_key':
        return `hz_${crypto.randomBytes(32).toString('hex')}`;
      default:
        return crypto.randomBytes(32).toString('hex');
    }
  }
}

// ===== Singleton Instance =====

export const secretsManager = new SecretsManager();

// ===== Environment Configuration =====

export const envConfig = {
  // Application
  NODE_ENV: getEnvironment(),
  APP_PORT: parseInt(process.env['APP_PORT'] || '3001', 10),
  APP_NAME: process.env['APP_NAME'] || 'HZ Navigator',
  APP_URL: process.env['APP_URL'] || 'http://localhost:3001',

  // Database (non-sensitive)
  POSTGRES_HOST: process.env['POSTGRES_HOST'] || 'localhost',
  POSTGRES_PORT: parseInt(process.env['POSTGRES_PORT'] || '5432', 10),
  POSTGRES_DB: process.env['POSTGRES_DB'] || 'hz_navigator',
  POSTGRES_USER: process.env['POSTGRES_USER'] || 'hz_admin',

  // CORS
  CORS_ORIGIN: process.env['CORS_ORIGIN'] || 'http://localhost:5173',
  CORS_ORIGINS: process.env['CORS_ORIGINS']?.split(',') || [],

  // JWT (non-sensitive config)
  JWT_EXPIRES_IN: process.env['JWT_EXPIRES_IN'] || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env['JWT_REFRESH_EXPIRES_IN'] || '30d',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env['RATE_LIMIT_MAX'] || '100', 10),

  // Logging
  LOG_LEVEL: process.env['LOG_LEVEL'] || 'info',
  LOG_FORMAT: process.env['LOG_FORMAT'] || 'combined',

  // Feature Flags
  ENABLE_SWAGGER: process.env['ENABLE_SWAGGER'] === 'true',
  ENABLE_METRICS: process.env['ENABLE_METRICS'] === 'true',

  // Helper methods
  isProduction: () => getEnvironment() === 'production',
  isDevelopment: () => getEnvironment() === 'development',
  isStaging: () => getEnvironment() === 'staging',
};

// ===== Validation on Startup =====

export async function validateEnvironment(): Promise<void> {
  const { valid, missing, warnings } = await secretsManager.validateSecrets();

  if (!valid) {
    console.error('❌ Missing required secrets:', missing.join(', '));
    if (envConfig.isProduction()) {
      throw new Error('Missing required secrets in production environment');
    } else {
      console.warn('⚠️  Running with missing secrets in non-production environment');
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Secret rotation warnings:');
    warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  // Check for insecure defaults in production
  if (envConfig.isProduction()) {
    const jwtSecret = await secretsManager.get('JWT_SECRET');
    if (jwtSecret === 'development-secret') {
      throw new Error('JWT_SECRET cannot be "development-secret" in production');
    }
  }

  console.info('✅ Environment validation passed');
}

export default secretsManager;

