import pinoHttp from 'pino-http';
import { logger } from '../utils/logger';
import { isTest } from '../config/env';

/**
 * HTTP request/response logger using pino-http.
 *
 * Logs every request with:
 *   - method, url, statusCode, responseTime
 *   - Sanitizes sensitive headers (Authorization, Cookie)
 *
 * Disabled in test environment to keep test output clean.
 */
export const requestLogger = pinoHttp({
  logger,
  enabled: !isTest,

  // Customize the log level per status code
  customLogLevel(_req, res, err) {
    if ((err !== null && err !== undefined) || res.statusCode >= 500) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },

  // Custom success/error message format
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} → ${res.statusCode}`;
  },
  customErrorMessage(req, res, err) {
    return `${req.method} ${req.url} → ${res.statusCode} | ${err.message}`;
  },

  // Strip sensitive request fields from logs
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
        // Never log Authorization or Cookie headers
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
