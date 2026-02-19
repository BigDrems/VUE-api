"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketServer = initSocketServer;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../core/config/env");
const prisma_1 = require("../core/config/prisma");
const geo_1 = require("../core/utils/geo");
// In-memory cache of last known positions to compute movement delta
const lastPositions = new Map();
// Minimum movement in metres before a DB write is triggered
const MIN_DELTA_METERS = 5;
function initSocketServer(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: { origin: "*" },
        // Use binary WebSocket frames for efficiency
        transports: ["websocket"],
    });
    // ── JWT auth middleware ──────────────────────────────────────────────────
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            next(new Error("Authentication token missing"));
            return;
        }
        try {
            const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
            if (payload.role !== "DRIVER" || !payload.driverId) {
                next(new Error("Only verified drivers can connect"));
                return;
            }
            socket.user = payload;
            next();
        }
        catch {
            next(new Error("Invalid token"));
        }
    });
    io.on("connection", (socket) => {
        const driver = socket.user;
        console.log(`[Socket] Driver ${driver.driverId} connected`);
        /**
         * Event: driver:ping
         * Payload: { lat: number; lng: number }
         *
         * Skips the DB write if movement delta < MIN_DELTA_METERS to save I/O.
         * Otherwise executes raw PostGIS SQL for the geography update.
         */
        socket.on("driver:ping", async (payload) => {
            const { lat, lng } = payload;
            if (typeof lat !== "number" || typeof lng !== "number") {
                socket.emit("error", { message: "Invalid ping payload" });
                return;
            }
            const last = lastPositions.get(driver.driverId);
            if (last) {
                const delta = (0, geo_1.haversineDistance)(last.lat, last.lng, lat, lng);
                if (delta < MIN_DELTA_METERS) {
                    // No meaningful movement — skip DB write
                    socket.emit("driver:ping:ack", { saved: false, delta });
                    return;
                }
            }
            try {
                // Raw PostGIS update — only touches VehicleLocation for this driver
                await prisma_1.prisma.$executeRaw `
            UPDATE "VehicleLocation"
            SET
              coords     = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
              "updatedAt" = NOW()
            WHERE "driverId" = ${driver.driverId}
              AND "isActive" = true
          `;
                lastPositions.set(driver.driverId, { lat, lng });
                console.log(`[Ping] Driver ${driver.driverId} → (${lat}, ${lng})`);
                socket.emit("driver:ping:ack", { saved: true, coords: { lat, lng } });
            }
            catch (err) {
                console.error(`[Ping] DB error for driver ${driver.driverId}:`, err);
                socket.emit("error", { message: "Failed to save location" });
            }
        });
        socket.on("disconnect", () => {
            console.log(`[Socket] Driver ${driver.driverId} disconnected`);
            lastPositions.delete(driver.driverId);
        });
    });
    return io;
}
//# sourceMappingURL=driverSocket.js.map