const fs = require("fs");
const path = require("path");
const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

fs.mkdirSync(path.resolve("logs"), { recursive: true });

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      level: "error",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      maxSize: "20m",
    }),
    new DailyRotateFile({
      filename: "logs/app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      maxSize: "20m",
    }),
  ],
});

if ((process.env.NODE_ENV || "development") !== "production") {
  logger.add(new transports.Console({ format: format.combine(format.colorize(), format.simple()) }));
}

module.exports = logger;
