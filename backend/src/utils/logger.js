/**
 * Simple Logger for Local Development
 */

const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${message}`, meta);
  },

  error: (message, meta = {}) => {
    console.error(`[ERROR] ${message}`, meta);
  },

  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${message}`, meta);
  },

  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  },

  // Stream for Morgan HTTP logging (compatibility)
  stream: {
    write: (message) => console.log(message.trim()),
  },
};

export default logger;
