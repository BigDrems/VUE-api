import express from "express";
import cors from "cors";
import { createServer } from "http";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRouter from "../routes/auth";
import shiftRouter from "../routes/shift";
import vehiclesRouter from "../routes/vehicles";
import { initSocketServer } from "../socket/driverSocket";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  //Health check 
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API routes
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/shift", shiftRouter);
  app.use("/api/v1/vehicles", vehiclesRouter);

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
