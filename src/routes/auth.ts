import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../core/config/prisma";
import { signToken } from "../core/middleware/auth";

const router = Router();

// Register
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["COMMUTER", "DRIVER"]).default("COMMUTER"),
  vehiclePlate: z.string().optional(),
});

router.post("/register", async (req: Request, res: Response) => {
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

  const hashed = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
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

    const token = signToken({
      sub: user.id,
      role: user.role,
      driverId: user.driver?.id,
    });

    res.status(201).json({ token, userId: user.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unique constraint")) {
      res.status(409).json({ error: "Email or vehicle plate already in use" });
      return;
    }
    throw err;
  }
});

// Login
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { driver: true },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({
    sub: user.id,
    role: user.role,
    driverId: user.driver?.id,
  });

  res.json({ token, userId: user.id, role: user.role });
});

export default router;
