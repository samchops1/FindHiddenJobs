/**
 * Production-ready logger utility
 * Provides structured logging for production and readable logs for development
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  
  private formatMessage(level: LogLevel, message: string, context?: any): void {
    if (this.isDevelopment) {
      // Development: Use colored, readable logs
      const prefix = this.getPrefix(level);
      console.log(`${prefix} ${message}`);
      if (context) {
        console.log('  Context:', context);
      }
    } else {
      // Production: Use structured JSON logs
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(context && { context })
      };
      console.log(JSON.stringify(logEntry));
    }
  }
  
  private getPrefix(level: LogLevel): string {
    switch (level) {
      case 'info': return '✅';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      case 'debug': return '🔍';
      default: return '📝';
    }
  }
  
  info(message: string, context?: any): void {
    this.formatMessage('info', message, context);
  }
  
  warn(message: string, context?: any): void {
    this.formatMessage('warn', message, context);
  }
  
  error(message: string, context?: any): void {
    this.formatMessage('error', message, context);
  }
  
  debug(message: string, context?: any): void {
    // Only log debug messages in development
    if (this.isDevelopment) {
      this.formatMessage('debug', message, context);
    }
  }
  
  // Special method for API requests
  api(method: string, path: string, statusCode: number, duration: number): void {
    if (this.isDevelopment) {
      console.log(`${method} ${path} ${statusCode} in ${duration}ms`);
    } else {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'api_request',
        method,
        path,
        statusCode,
        duration
      };
      console.log(JSON.stringify(logEntry));
    }
  }
  
  // Special method for scraping results
  scraping(platform: string, jobsFound: number, success: boolean): void {
    if (this.isDevelopment) {
      const emoji = success ? '✅' : '❌';
      console.log(`${emoji} ${platform}: Found ${jobsFound} jobs`);
    } else {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'scraping_result',
        platform,
        jobsFound,
        success
      };
      console.log(JSON.stringify(logEntry));
    }
  }
}

export const logger = new Logger();