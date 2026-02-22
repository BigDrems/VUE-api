import { Redis } from "ioredis";

// We assume REDIS_URL exists in the environment, fallback to localhost
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Standard Redis client for Data (Geo, Cache, etc.)
export const redisClient = new Redis(redisUrl);

// Pub/Sub clients used for Socket.io Redis Adapter
export const pubClient = redisClient.duplicate();
export const subClient = redisClient.duplicate();

redisClient.on("error", (err) => {
    if (process.env.NODE_ENV !== "test") {
        console.error("[Redis] Client Error:", err);
    }
});
