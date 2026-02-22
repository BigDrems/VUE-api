import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { env } from "./config/env";
import { setupSwagger } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";
import { authLimiter, apiLimiter } from "./middleware/rateLimiter";
import authRouter from "../routes/auth";
import shiftRouter from "../routes/shift";
import vehiclesRouter from "../routes/vehicles";
import { initSocketServer } from "../socket/driverSocket";

export function createApp() {
  const app = express();

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
      credentials: true,
    })
  );

  // We apply specific rate limiters to routes below instead of globally

  app.use(express.json());

  // Setup Swagger API Docs
  setupSwagger(app);

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use("/api/v1/auth", authLimiter, authRouter);
  app.use("/api/v1/shift", apiLimiter, shiftRouter);
  app.use("/api/v1/vehicles", apiLimiter, vehiclesRouter);

  app.use(errorHandler);

  return app;
}

export function startServer() {
  const app = createApp();
  const httpServer = createServer(app);

  // Attach Socket.io to the same HTTP server
  initSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(
      `[LYT] Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`
    );
    console.log(
      `[LYT] Terminal geofence: (${env.TERMINAL_LAT}, ${env.TERMINAL_LNG}) ±${env.TERMINAL_RADIUS_METERS}m`
    );
  });

  return httpServer;
}
