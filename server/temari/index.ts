import express, { type Express, type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import authRoutes from "./auth.routes";
import lessonsRoutes from "./lessons.routes";
import leaderboardRoutes from "./leaderboard.routes";
import aiRoutes from "./ai.routes";
import chapaRoutes from "./chapa.routes";
import adminRoutes from "./admin.routes";
import { failIfError } from "./helpers";

export function registerTemariRoutes(app: Express) {
  app.use("/api/auth", authRoutes);
  app.use("/api/lessons", lessonsRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/chapa", chapaRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/admin-dashboard", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  }, express.static(path.resolve(process.cwd(), "admin-dashboard"), { index: "index.html", fallthrough: true }));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => failIfError(error, res));
}
