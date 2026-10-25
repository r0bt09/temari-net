import { compare, hash } from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import type { Request, RequestHandler } from "express";
import { one } from "./db";

export type TemariRole = "student" | "teacher" | "admin";
export type TemariIdentity = { id: number; fullName: string; email: string; role: TemariRole; gradeLevel: string; coins: number; streak: number };

declare global {
  namespace Express {
    interface Request { temariUser?: TemariIdentity }
  }
}

function jwtKey(): Uint8Array {
  const configured = process.env.TEMARI_JWT_SECRET || process.env.MANUS_JWT_SECRET || process.env.JWT_SECRET;
  if (!configured && process.env.NODE_ENV === "production") throw new Error("TEMARI_JWT_SECRET is required in production");
  return new TextEncoder().encode(configured || "temarinet-development-only-secret-change-before-deploy-2026");
}

export async function issueToken(user: TemariIdentity): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuer("temari-net")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwtKey());
}

export function publicUser(row: Record<string, unknown>): TemariIdentity {
  return {
    id: Number(row.id),
    fullName: String(row.full_name ?? row.fullName ?? ""),
    email: String(row.email ?? ""),
    role: String(row.role ?? "student") as TemariRole,
    gradeLevel: String(row.grade_level ?? row.gradeLevel ?? "Grade 1"),
    coins: Number(row.coins ?? 50),
    streak: Number(row.streak ?? 1),
  };
}

async function identify(req: Request): Promise<TemariIdentity | null> {
  const header = req.header("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], jwtKey(), { issuer: "temari-net" });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id < 1) return null;
    const row = await one<Record<string, unknown>>(
      "SELECT id, full_name, email, role, grade_level, coins, streak FROM temari_users WHERE id = ? LIMIT 1",
      [id],
    );
    return row ? publicUser(row) : null;
  } catch {
    return null;
  }
}

export const optionalAuth: RequestHandler = (req, res, next) => {
  void identify(req).then((user) => {
    req.temariUser = user ?? undefined;
    next();
  }).catch(next);
};

export const authenticate: RequestHandler = (req, res, next) => {
  void identify(req).then((user) => {
    if (!user) return res.status(401).json({ error: "Please sign in to continue." });
    req.temariUser = user;
    next();
  }).catch(next);
};

export function requireRoles(...roles: TemariRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.temariUser) return res.status(401).json({ error: "Please sign in to continue." });
    if (!roles.includes(req.temariUser.role)) return res.status(403).json({ error: "This action needs a teacher or admin account." });
    next();
  };
}

export const hashPassword = (password: string) => hash(password, 12);
export const verifyPassword = (password: string, passwordHash: string) => compare(password, passwordHash);
