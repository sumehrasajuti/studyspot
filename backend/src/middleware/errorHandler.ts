import { NextFunction, Request, Response } from "express";

// Express requires exactly 4 params for error-handling middleware to be recognized.
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);
  res.status(500).json({ error: "Something went wrong", detail: err.message });
}
