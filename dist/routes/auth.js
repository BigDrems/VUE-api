"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const prisma_1 = require("../core/config/prisma");
const auth_1 = require("../core/middleware/auth");
const router = (0, express_1.Router)();
// Register
const RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    role: zod_1.z.enum(["COMMUTER", "DRIVER"]).default("COMMUTER"),
    vehiclePlate: zod_1.z.string().optional(),
});
router.post("/register", async (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { email, password, role, vehiclePlate } = parsed.data;
    if (role === "DRIVER" && !vehiclePlate) {
        res.status(400).json({ error: "vehiclePlate is required for drivers" });
        return;
    }
    const hashed = await bcryptjs_1.default.hash(password, 12);
    try {
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                password: hashed,
                role,
                ...(role === "DRIVER" && vehiclePlate
                    ? {
                        driver: {
                            create: { vehiclePlate },
                        },
                    }
                    : {}),
            },
            include: { driver: true },
        });
        const token = (0, auth_1.signToken)({
            sub: user.id,
            role: user.role,
            driverId: user.driver?.id,
        });
        res.status(201).json({ token, userId: user.id });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Unique constraint")) {
            res.status(409).json({ error: "Email or vehicle plate already in use" });
            return;
        }
        throw err;
    }
});
// Login
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
router.post("/login", async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { email, password } = parsed.data;
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
        include: { driver: true },
    });
    if (!user || !(await bcryptjs_1.default.compare(password, user.password))) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }
    const token = (0, auth_1.signToken)({
        sub: user.id,
        role: user.role,
        driverId: user.driver?.id,
    });
    res.json({ token, userId: user.id, role: user.role });
});
exports.default = router;
//# sourceMappingURL=auth.js.map