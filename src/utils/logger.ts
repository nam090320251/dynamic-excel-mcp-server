const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export const logger = {
  error: (...args: any[]) => {
    if (levels[LOG_LEVEL as keyof typeof levels] >= levels.error) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  },

  warn: (...args: any[]) => {
    if (levels[LOG_LEVEL as keyof typeof levels] >= levels.warn) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  },

  info: (...args: any[]) => {
    if (levels[LOG_LEVEL as keyof typeof levels] >= levels.info) {
      console.error('[INFO]', new Date().toISOString(), ...args);
    }
  },

  debug: (...args: any[]) => {
    if (levels[LOG_LEVEL as keyof typeof levels] >= levels.debug) {
      console.error('[DEBUG]', new Date().toISOString(), ...args);
    }
  },
};
