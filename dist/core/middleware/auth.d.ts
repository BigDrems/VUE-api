import { Request, Response, NextFunction } from "express";
export interface JwtPayload {
    sub: string;
    role: "COMMUTER" | "DRIVER";
    driverId?: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
export declare function authenticate(req: Request, res: Response, next: NextFunction): void;
export declare function requireDriver(req: Request, res: Response, next: NextFunction): void;
export declare function signToken(payload: JwtPayload): string;
//# sourceMappingURL=auth.d.ts.map