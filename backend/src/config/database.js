const mongoose = require("mongoose");
const logger = require("./logger");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required. Add a reachable MongoDB/Atlas connection string to Render environment variables.");

  if (/mongodb(\+srv)?:\/\/127\.0\.0\.1|mongodb(\+srv)?:\/\/localhost/i.test(uri)) {
    throw new Error("MONGODB_URI points to localhost/127.0.0.1. Render cannot reach MongoDB running on your local machine. Use MongoDB Atlas or another publicly reachable MongoDB service.");
  }

  mongoose.set("strictQuery", true);
  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("error", (err) => logger.error(`MongoDB error: ${err.message}`));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000),
      connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 10000),
      socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 45000),
      maxPoolSize: 20,
    });
  } catch (err) {
    throw new Error(`MongoDB connection failed: ${err.message}`);
  }
}

module.exports = { connectDB };
