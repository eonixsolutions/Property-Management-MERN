import pino from 'pino';
import { env, isDev } from '../config/env';

/**
 * Application-wide Pino logger.
 *
 * Development: pretty-prints to stdout with colors via pino-pretty
 * Production:  emits structured JSON to stdout (parse with log aggregators)
 *
 * Usage:
 *   import { logger } from '@utils/logger';
 *   logger.info({ userId: '123' }, 'User logged in');
 *   logger.error({ err }, 'Something failed');
 */
export const logger = pino(
  {
    level: env.LOG_LEVEL,
    base: {
      app: env.APP_NAME,
      version: env.APP_VERSION,
      env: env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label.toUpperCase() };
      },
    },
    // Redact sensitive fields from log output
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'body.password',
        'body.currentPassword',
        'body.newPassword',
      ],
      censor: '[REDACTED]',
    },
  },
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname,app,version,env',
          messageFormat: '{msg}',
          levelFirst: true,
        },
      })
    : pino.destination({ sync: false }),
);

/**
 * Child logger factory — attach a fixed context to every log call.
 *
 * Example:
 *   const log = childLogger('InvoiceService');
 *   log.info('Generating invoices');
 *   // → { "service": "InvoiceService", "msg": "Generating invoices" }
 */
export function childLogger(service: string): pino.Logger {
  return logger.child({ service });
}
