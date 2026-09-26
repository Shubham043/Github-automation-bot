import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  level: config.isProduction ? 'info' : 'debug',
  transport: config.isProduction ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    }
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'access_token',
      'webhook_secret',
      'password',
      'secret'
    ],
    remove: true,
  }
});
