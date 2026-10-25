import { Router } from "express";
import { rows } from "./db";
import { asyncRoute, ApiError } from "./helpers";

const router = Router();
router.get("/", asyncRoute(async (req, res) => {
  const role = typeof req.query.role === "string" ? req.query.role : "student";
  if (role !== "student" && role !== "teacher") throw new ApiError(400, "Role must be student or teacher.");
  const leaders = await rows<Record<string, unknown>>("SELECT id, full_name, role, grade_level, coins FROM temari_users WHERE role = ? ORDER BY coins DESC, id ASC LIMIT 20", [role]);
  res.json(leaders.map((row) => ({ id: Number(row.id), fullName: String(row.full_name), role: String(row.role), gradeLevel: String(row.grade_level), coins: Number(row.coins) })));
}));
export default router;
