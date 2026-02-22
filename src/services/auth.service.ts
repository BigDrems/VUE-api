import bcrypt from "bcryptjs";
import { prisma } from "../core/config/prisma";
import { signToken } from "../core/middleware/auth";
import { supabase } from "../core/config/supabase";
import {
    BadRequestError,
    NotFoundError,
    UnauthorizedError,
    ConflictError,
} from "../core/errors/AppError";
import { Provider } from "@supabase/supabase-js";

export class AuthService {
    static async getMe(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { driver: true },
        });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    static async verifyDriver(driverId: string) {
        try {
            const driver = await prisma.driver.update({
                where: { id: driverId },
                data: { isVerified: true },
                include: { user: true },
            });
            return driver;
        } catch (err) {
            throw new NotFoundError("Driver not found");
        }
    }

    static async register(data: any) {
        const { email, password, role, vehiclePlate } = data;

        if (role === "DRIVER" && !vehiclePlate) {
            throw new BadRequestError("vehiclePlate is required for drivers");
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

            return { token, userId: user.id };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("Unique constraint")) {
                throw new ConflictError("Email or vehicle plate already in use");
            }
            throw err;
        }
    }

    static async login(data: any) {
        const { email, password } = data;

        const user = await prisma.user.findUnique({
            where: { email },
            include: { driver: true },
        });

        if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
            throw new UnauthorizedError("Invalid credentials");
        }

        const token = signToken({
            sub: user.id,
            role: user.role,
            driverId: user.driver?.id,
        });

        return { token, userId: user.id, role: user.role };
    }

    static async getOAuthUrl(provider: Provider, protocol: string, host: string) {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${protocol}://${host}/api/v1/auth/callback`,
            },
        });

        if (error) {
            throw new BadRequestError(error.message);
        }

        return data.url;
    }

    static async sync(data: any) {
        const { accessToken, role, vehiclePlate } = data;

        const { data: { user: sbUser }, error: sbError } = await supabase.auth.getUser(accessToken);
        if (sbError || !sbUser) {
            throw new UnauthorizedError("Invalid Supabase token");
        }

        let user = await prisma.user.findFirst({
            where: {
                OR: [{ supabaseId: sbUser.id }, { email: sbUser.email! }],
            },
            include: { driver: true },
        });

        if (!user) {
            if (role === "DRIVER" && !vehiclePlate) {
                throw new BadRequestError("vehiclePlate is required for drivers");
            }

            user = await prisma.user.create({
                data: {
                    email: sbUser.email!,
                    supabaseId: sbUser.id,
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
        } else {
            if (!user.supabaseId) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { supabaseId: sbUser.id },
                    include: { driver: true },
                });
            }
        }

        const token = signToken({
            sub: user.id,
            role: user.role,
            driverId: user.driver?.id,
        });

        return { token, userId: user.id, role: user.role };
    }
}
