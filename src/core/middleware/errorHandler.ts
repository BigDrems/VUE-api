import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { env } from "../config/env";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  let statusCode = 500;
  let message = "Internal server error";
  let errors: any[] | undefined = undefined;

  // App Errors (Custom)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation error";
    errors = err.issues;
  }

  // Handle Prisma Unique Constraint Violation
  if (err.message.includes("Unique constraint")) {
    statusCode = 409;
    message = "Resource already exists";
  }

  // Log only in development or if it's a 500 error
  if (env.NODE_ENV === "development" || statusCode === 500) {
    console.error(`[ErrorHandler] ${err.name}: ${err.message}`);
    if (statusCode === 500) {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    status: "error",
    message,
    ...(errors && { errors }),
    ...(env.NODE_ENV === "development" && statusCode === 500 && { stack: err.stack }),
  });
}
