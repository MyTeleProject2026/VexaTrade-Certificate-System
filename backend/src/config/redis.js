const { createClient } = require("redis");
const logger = require("./logger");

const enabled = String(process.env.REDIS_ENABLED || "false") === "true";

const client = enabled
  ? createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379" })
  : {
      isReady: false,
      async connect() {},
      async get() { return null; },
      async set() {},
      async del() {},
      async quit() {},
    };

if (enabled) {
  client.on("error", (err) => logger.error("Redis error", { error: err.message }));
}

module.exports = {
  ...client,
  enabled,
};
