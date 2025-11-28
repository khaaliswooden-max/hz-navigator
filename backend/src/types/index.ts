// Re-export all types
export * from './hubzone.js';
export * from './compliance.js';
export * from './alert.js';
export * from './hubzoneMapLoader.js';
export * from './map.js';
export * from './job.js';
export * from './agency.js';
export * from './analytics.js';
export * from './contract.js';
export * from './document.js';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Environment variables type
 */
export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  APP_PORT: number;
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'admin' | 'reviewer';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Business entity
 */
export interface Business {
  id: string;
  user_id: string;
  name: string;
  duns_number: string;
  ein: string;
  primary_address: string;
  principal_office_address: string;
  website?: string;
  phone: string;
  created_at: Date;
  updated_at: Date;
}

