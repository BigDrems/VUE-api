"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = __importDefault(require("../routes/auth"));
const shift_1 = __importDefault(require("../routes/shift"));
const vehicles_1 = __importDefault(require("../routes/vehicles"));
const driverSocket_1 = require("../socket/driverSocket");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    // ── Health check ──────────────────────────────────────────────────────────
    app.get("/health", (_req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
    // ── API routes ────────────────────────────────────────────────────────────
    app.use("/api/v1/auth", auth_1.default);
    app.use("/api/v1/shift", shift_1.default);
    app.use("/api/v1/vehicles", vehicles_1.default);
    app.use(errorHandler_1.errorHandler);
    return app;
}
function startServer() {
    const app = createApp();
    const httpServer = (0, http_1.createServer)(app);
    // Attach Socket.io to the same HTTP server
    (0, driverSocket_1.initSocketServer)(httpServer);
    httpServer.listen(env_1.env.PORT, () => {
        console.log(`[LYT] Server running on http://localhost:${env_1.env.PORT} (${env_1.env.NODE_ENV})`);
        console.log(`[LYT] Terminal geofence: (${env_1.env.TERMINAL_LAT}, ${env_1.env.TERMINAL_LNG}) ±${env_1.env.TERMINAL_RADIUS_METERS}m`);
    });
    return httpServer;
}
//# sourceMappingURL=server.js.map