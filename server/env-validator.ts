/**
 * Environment variable validation for production
 * Ensures all required variables are set before starting the server
 */

import { logger } from './logger';

interface EnvConfig {
  required: string[];
  optional: string[];
}

const envConfig: EnvConfig = {
  required: [
    // Core functionality
    'GOOGLE_SEARCH_API_KEY',
    'GOOGLE_SEARCH_ENGINE_ID',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET'
  ],
  optional: [
    // Email functionality
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'ADMIN_EMAIL',
    'ADMIN_API_KEY',
    
    // AI features
    'OPENAI_API_KEY',
    
    // Database
    'DATABASE_URL',
    
    // Server
    'PORT',
    'NODE_ENV',
    'SESSION_SECRET'
  ]
};

export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check required variables
  const missingRequired = envConfig.required.filter(key => !process.env[key]);
  
  if (missingRequired.length > 0) {
    logger.error('Missing required environment variables', { missing: missingRequired });
    
    if (isProduction) {
      // In production, exit if required variables are missing
      logger.error('Cannot start server in production without required environment variables');
      process.exit(1);
    } else {
      // In development, warn but continue
      logger.warn('Running in development mode with missing environment variables');
      logger.warn('Some features may not work correctly');
    }
  }
  
  // Check optional variables and warn if missing
  const missingOptional = envConfig.optional.filter(key => !process.env[key]);
  
  if (missingOptional.length > 0) {
    logger.warn('Missing optional environment variables', { missing: missingOptional });
    
    // Provide specific warnings for important optional variables
    if (!process.env.RESEND_API_KEY) {
      logger.warn('Email sending will not work without RESEND_API_KEY');
    }
    
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('Resume analysis will use fallback parser without OPENAI_API_KEY');
    }
    
    if (!process.env.ADMIN_API_KEY && isProduction) {
      logger.warn('Admin endpoints are not protected without ADMIN_API_KEY');
    }
  }
  
  // Validate API key formats
  if (process.env.GOOGLE_SEARCH_API_KEY && !process.env.GOOGLE_SEARCH_API_KEY.startsWith('AIza')) {
    logger.warn('GOOGLE_SEARCH_API_KEY format looks incorrect');
  }
  
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET should be at least 32 characters for security');
  }
  
  // Log configuration status
  logger.info('Environment configuration validated', {
    mode: process.env.NODE_ENV || 'development',
    emailEnabled: !!process.env.RESEND_API_KEY,
    aiEnabled: !!process.env.OPENAI_API_KEY,
    databaseEnabled: !!process.env.DATABASE_URL,
    supabaseEnabled: !!process.env.SUPABASE_URL
  });
}

/**
 * Get environment variable with fallback
 */
export function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];
  
  if (!value && !fallback) {
    logger.warn(`Environment variable ${key} is not set and has no fallback`);
  }
  
  return value || fallback || '';
}

/**
 * Check if a feature is enabled based on environment variables
 */
export function isFeatureEnabled(feature: 'email' | 'ai' | 'database' | 'supabase'): boolean {
  switch (feature) {
    case 'email':
      return !!process.env.RESEND_API_KEY;
    case 'ai':
      return !!process.env.OPENAI_API_KEY;
    case 'database':
      return !!process.env.DATABASE_URL;
    case 'supabase':
      return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    default:
      return false;
  }
}