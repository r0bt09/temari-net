import type { Request, RequestHandler, Response } from "express";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function asyncRoute(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req, res, next) => { void handler(req, res).catch(next); };
}

export function requiredText(value: unknown, field: string, maxLength: number): string {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > maxLength) throw new ApiError(400, `${field} is required and must be at most ${maxLength} characters.`);
  return result;
}

export function failIfError(error: unknown, res: Response): void {
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("[TEMARI API] Request failed:", message);
  res.status(500).json({ error: "The server could not complete that request. Please try again." });
}
