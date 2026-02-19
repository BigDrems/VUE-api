import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../core/config/env";
import { prisma } from "../core/config/prisma";
import { haversineDistance } from "../core/utils/geo";
import type { JwtPayload } from "../core/middleware/auth";

// In-memory cache of last known positions to compute movement delta
const lastPositions = new Map<string, { lat: number; lng: number }>();

// Minimum movement in metres before a DB write is triggered
const MIN_DELTA_METERS = 5;

export function initSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: "*" },
    // Use binary WebSocket frames for efficiency
    transports: ["websocket"],
  });

  //JWT auth middleware 
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("Authentication token missing"));
      return;
    }
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      if (payload.role !== "DRIVER" || !payload.driverId) {
        next(new Error("Only verified drivers can connect"));
        return;
      }
      (socket as Socket & { user: JwtPayload }).user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const driver = (socket as Socket & { user: JwtPayload }).user;
    console.log(`[Socket] Driver ${driver.driverId} connected`);

    /**
     * Event: driver:ping
     * Payload: { lat: number; lng: number }
     *
     * Skips the DB write if movement delta < MIN_DELTA_METERS to save I/O.
     * Otherwise executes raw PostGIS SQL for the geography update.
     */
    socket.on(
      "driver:ping",
      async (payload: { lat: number; lng: number }) => {
        const { lat, lng } = payload;

        if (typeof lat !== "number" || typeof lng !== "number") {
          socket.emit("error", { message: "Invalid ping payload" });
          return;
        }

        const last = lastPositions.get(driver.driverId!);

        if (last) {
          const delta = haversineDistance(last.lat, last.lng, lat, lng);
          if (delta < MIN_DELTA_METERS) {
            // No meaningful movement — skip DB write
            socket.emit("driver:ping:ack", { saved: false, delta });
            return;
          }
        }

        try {
          // Raw PostGIS update — only touches VehicleLocation for this driver
          await prisma.$executeRaw`
            UPDATE "VehicleLocation"
            SET
              coords     = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
              "updatedAt" = NOW()
            WHERE "driverId" = ${driver.driverId}
              AND "isActive" = true
          `;

          lastPositions.set(driver.driverId!, { lat, lng });

          console.log(
            `[Ping] Driver ${driver.driverId} → (${lat}, ${lng})`
          );

          socket.emit("driver:ping:ack", { saved: true, coords: { lat, lng } });
        } catch (err) {
          console.error(`[Ping] DB error for driver ${driver.driverId}:`, err);
          socket.emit("error", { message: "Failed to save location" });
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`[Socket] Driver ${driver.driverId} disconnected`);
      lastPositions.delete(driver.driverId!);
    });
  });

  return io;
}
