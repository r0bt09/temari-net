import { Router } from "express";
import { one, readOptions, rows, transaction } from "./db";
import { asyncRoute, ApiError, requiredText } from "./helpers";
import { authenticate, requireRoles } from "./security";

const router = Router();
const subjects = new Set(["Amharic", "Math", "English", "Science"]);
const grades = new Set(["Pre-K", "Grade 1", "Grade 2", "Grade 3", "Grade 4"]);
router.get("/overview", authenticate, requireRoles("teacher", "admin"), asyncRoute(async (_req, res) => {
  const counts = await one<Record<string, number | string>>(`SELECT
    (SELECT COUNT(*) FROM temari_users WHERE role = 'student') AS totalStudents,
    (SELECT COUNT(*) FROM temari_users WHERE role = 'teacher') AS totalTeachers,
    (SELECT COUNT(*) FROM temari_lessons) AS totalLessons,
    (SELECT COALESCE(SUM(amount_etb),0) FROM temari_sponsorships WHERE status='completed') AS totalRevenue`);
  const [allUsers, lessons, sponsorships] = await Promise.all([
    rows<Record<string, unknown>>("SELECT id, full_name, email, role, grade_level, coins, streak, created_at FROM temari_users ORDER BY created_at DESC"),
    rows<Record<string, unknown>>("SELECT id, title, subject, grade_level, question, options, correct_answer, pronunciation_word, reward_coins, created_at FROM temari_lessons ORDER BY id ASC"),
    rows<Record<string, unknown>>("SELECT id, sponsor_name, email, phone_number, amount_etb, student_id, status, tx_ref, created_at FROM temari_sponsorships ORDER BY created_at DESC LIMIT 20"),
  ]);
  const users = allUsers.map((row) => ({ id: Number(row.id), fullName: String(row.full_name), email: String(row.email), role: String(row.role), gradeLevel: String(row.grade_level), coins: Number(row.coins), streak: Number(row.streak), createdAt: row.created_at }));
  res.json({ totalStudents: Number(counts?.totalStudents ?? 0), totalTeachers: Number(counts?.totalTeachers ?? 0), totalLessons: Number(counts?.totalLessons ?? 0), totalRevenue: Number(counts?.totalRevenue ?? 0), users, recentUsers: users.slice(0, 12), lessons: lessons.map((row) => ({ id: Number(row.id), title: String(row.title), subject: String(row.subject), gradeLevel: String(row.grade_level), question: String(row.question), options: readOptions(row.options), correctAnswer: String(row.correct_answer), pronunciationWord: row.pronunciation_word ?? null, rewardCoins: Number(row.reward_coins) })), sponsorships });
}));

router.post("/lessons", authenticate, requireRoles("teacher", "admin"), asyncRoute(async (req, res) => {
  const title = requiredText(req.body?.title, "Title", 150);
  const subject = String(req.body?.subject ?? "");
  const gradeLevel = requiredText(req.body?.grade_level ?? req.body?.gradeLevel, "Grade level", 50);
  const question = requiredText(req.body?.question, "Question", 1000);
  const options = Array.isArray(req.body?.options) ? req.body.options.map((option: unknown) => String(option).trim()) : [];
  const correctAnswer = requiredText(req.body?.correct_answer ?? req.body?.correctAnswer, "Correct answer", 150);
  const pronunciationWord = typeof req.body?.pronunciation_word === "string" ? req.body.pronunciation_word.trim().slice(0, 150) : null;
  const rewardCoins = Number(req.body?.reward_coins ?? 15);
  if (!subjects.has(subject)) throw new ApiError(400, "Choose Amharic, Math, English, or Science.");
  if (!grades.has(gradeLevel)) throw new ApiError(400, "Choose a supported grade level.");
  if (options.length !== 4 || options.some((option: string) => !option || option.length > 150)) throw new ApiError(400, "Each lesson needs exactly four non-empty choices.");
  if (!options.includes(correctAnswer)) throw new ApiError(400, "Correct answer must exactly match one of the four choices.");
  if (!Number.isInteger(rewardCoins) || rewardCoins < 0 || rewardCoins > 10_000) throw new ApiError(400, "Reward coins must be from 0 to 10,000.");
  const [insert] = await (await import("./db")).temariPool().execute("INSERT INTO temari_lessons (title, subject, grade_level, question, options, correct_answer, pronunciation_word, reward_coins) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [title, subject, gradeLevel, question, JSON.stringify(options), correctAnswer, pronunciationWord, rewardCoins]);
  res.status(201).json({ id: Number((insert as { insertId: number }).insertId), title, subject, gradeLevel, question, options, correctAnswer, pronunciationWord, rewardCoins });
}));

router.delete("/lessons/:id", authenticate, requireRoles("teacher", "admin"), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Invalid lesson ID.");
  await transaction(async (connection) => { await connection.execute("DELETE FROM temari_lessons WHERE id = ?", [id]); });
  res.json({ ok: true });
}));

router.delete("/users/:id", authenticate, requireRoles("admin"), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Invalid user ID.");
  if (id === req.temariUser?.id) throw new ApiError(409, "You cannot delete your own signed-in account.");
  await transaction(async (connection) => {
    const [targets] = await connection.execute("SELECT role FROM temari_users WHERE id = ? FOR UPDATE", [id]);
    const target = (targets as Array<{ role: string }>)[0];
    if (!target) throw new ApiError(404, "User not found.");
    if (target.role === "admin") {
      const remaining = await connection.execute("SELECT COUNT(*) AS total FROM temari_users WHERE role = 'admin'");
      const [rows] = remaining;
      if (Number((rows as Array<{ total: number | string }>)[0]?.total ?? 0) <= 1) throw new ApiError(409, "The final administrator cannot be deleted.");
    }
    await connection.execute("DELETE FROM temari_users WHERE id = ?", [id]);
  });
  res.json({ ok: true });
}));
export default router;
