import { Router } from "express";
import { one, transaction } from "./db";
import { asyncRoute, ApiError, requiredText } from "./helpers";
import { authenticate, hashPassword, issueToken, optionalAuth, publicUser, requireRoles, verifyPassword } from "./security";

const router = Router();
const grades = new Set(["Pre-K", "Grade 1", "Grade 2", "Grade 3", "Grade 4"]);
const roles = new Set(["student", "teacher", "admin"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get("/bootstrap-status", asyncRoute(async (_req, res) => {
  const admins = await one<{ total: number | string }>("SELECT COUNT(*) AS total FROM temari_users WHERE role = 'admin'");
  res.json({ adminAvailable: Number(admins?.total ?? 0) > 0 });
}));

router.post("/register", optionalAuth, asyncRoute(async (req, res) => {
  const fullName = requiredText(req.body?.full_name ?? req.body?.fullName, "Name", 100);
  const email = requiredText(req.body?.email, "Email", 100).toLowerCase();
  const password = requiredText(req.body?.password, "Password", 200);
  const role = String(req.body?.role ?? "student");
  const gradeLevel = String(req.body?.grade_level ?? req.body?.gradeLevel ?? "Grade 1");
  const teacherId = req.body?.registered_by_teacher_id == null || req.body.registered_by_teacher_id === "" ? null : Number(req.body.registered_by_teacher_id);
  if (!emailPattern.test(email)) throw new ApiError(400, "Enter a valid email address.");
  if (password.length < 8) throw new ApiError(400, "Password must be at least 8 characters.");
  if (!roles.has(role)) throw new ApiError(400, "Choose student, teacher, or admin as the account role.");
  if (!grades.has(gradeLevel)) throw new ApiError(400, "Choose a supported grade level.");
  if (role !== "student") {
    const admins = await one<{ total: number | string }>("SELECT COUNT(*) AS total FROM temari_users WHERE role = 'admin'");
    const isBootstrap = Number(admins?.total ?? 0) === 0 && role === "admin";
    if (!isBootstrap && req.temariUser?.role !== "admin") throw new ApiError(403, "A signed-in admin must create teacher and admin accounts.");
  }
  const passwordHash = await hashPassword(password);
  const created = await transaction(async (connection) => {
    const [existing] = await connection.execute("SELECT id FROM temari_users WHERE email = ? LIMIT 1", [email]);
    if ((existing as unknown[]).length) throw new ApiError(409, "An account already uses this email.");
    if (teacherId !== null) {
      if (!Number.isInteger(teacherId) || teacherId < 1) throw new ApiError(400, "Referred by Teacher ID must be a positive number.");
      const [teacherRows] = await connection.execute("SELECT id, role FROM temari_users WHERE id = ? FOR UPDATE", [teacherId]);
      const teacher = (teacherRows as Array<{ id: number; role: string }>)[0];
      if (!teacher || teacher.role !== "teacher") throw new ApiError(400, "That Teacher ID is not active.");
    }
    const [inserted] = await connection.execute(
      "INSERT INTO temari_users (full_name, email, password_hash, role, grade_level, coins, streak, registered_by_teacher_id) VALUES (?, ?, ?, ?, ?, 50, 1, ?)",
      [fullName, email, passwordHash, role, gradeLevel, teacherId],
    );
    const id = Number((inserted as { insertId: number | bigint }).insertId);
    if (teacherId !== null) await connection.execute("UPDATE temari_users SET coins = coins + 10 WHERE id = ?", [teacherId]);
    const [userRows] = await connection.execute("SELECT id, full_name, email, role, grade_level, coins, streak FROM temari_users WHERE id = ?", [id]);
    return (userRows as Array<Record<string, unknown>>)[0];
  });
  const user = publicUser(created);
  res.status(201).json({ user, token: await issueToken(user) });
}));

router.post("/login", asyncRoute(async (req, res) => {
  const email = requiredText(req.body?.email, "Email", 100).toLowerCase();
  const password = requiredText(req.body?.password, "Password", 200);
  const row = await one<Record<string, unknown> & { password_hash: string }>("SELECT id, full_name, email, password_hash, role, grade_level, coins, streak FROM temari_users WHERE email = ? LIMIT 1", [email]);
  if (!row || !(await verifyPassword(password, row.password_hash))) throw new ApiError(401, "Email or password is not correct.");
  const user = publicUser(row);
  res.json({ user, token: await issueToken(user) });
}));

router.get("/me", authenticate, (req, res) => res.json({ user: req.temariUser }));
router.post("/logout", (_req, res) => res.json({ ok: true }));
router.get("/users", authenticate, requireRoles("teacher", "admin"), asyncRoute(async (_req, res) => {
  const users = await (await import("./db")).rows<Record<string, unknown>>("SELECT id, full_name, email, role, grade_level, coins, streak, created_at FROM temari_users ORDER BY id DESC");
  res.json(users.map(publicUser));
}));

export default router;
