const { createClient } = require("redis");
const logger = require("./logger");

const enabled = String(process.env.REDIS_ENABLED || "false") === "true";
const memory = new Map();

const client = enabled
  ? createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379" })
  : {
      isReady: false,
      async connect() {},
      async get(key) {
        const item = memory.get(key);
        if (!item) return null;
        if (item.expiresAt && item.expiresAt < Date.now()) { memory.delete(key); return null; }
        return item.value;
      },
      async set(key, value, options = {}) {
        const seconds = options.EX || options.ex;
        memory.set(key, { value: String(value), expiresAt: seconds ? Date.now() + Number(seconds) * 1000 : 0 });
        return "OK";
      },
      async del(key) { memory.delete(key); return 1; },
      async quit() { memory.clear(); },
    };

if (enabled) client.on("error", (err) => logger.error("Redis error", { error: err.message }));

module.exports = { ...client, enabled };
