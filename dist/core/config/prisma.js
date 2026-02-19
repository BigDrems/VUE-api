"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const env_1 = require("./env");
const globalForPrisma = globalThis;
const pool = new pg_1.Pool({ connectionString: env_1.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        adapter,
        log: env_1.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    });
if (env_1.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = exports.prisma;
}
//# sourceMappingURL=prisma.js.map