"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function requireEnv(key) {
    const value = process.env[key];
    if (!value)
        throw new Error(`Missing required environment variable: ${key}`);
    return value;
}
exports.env = {
    PORT: parseInt(process.env.PORT || "3000", 10),
    NODE_ENV: process.env.NODE_ENV || "development",
    DATABASE_URL: requireEnv("DATABASE_URL"),
    JWT_SECRET: requireEnv("JWT_SECRET"),
    // Leyte terminal geofence (defaults to Ormoc City terminal)
    TERMINAL_LAT: parseFloat(process.env.TERMINAL_LAT || "11.2543"),
    TERMINAL_LNG: parseFloat(process.env.TERMINAL_LNG || "124.9945"),
    TERMINAL_RADIUS_METERS: parseInt(process.env.TERMINAL_RADIUS_METERS || "500", 10),
};
//# sourceMappingURL=env.js.map