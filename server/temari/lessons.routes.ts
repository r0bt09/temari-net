import { Router } from "express";
import { one, readOptions, rows, transaction } from "./db";
import { asyncRoute, ApiError } from "./helpers";
import { authenticate, publicUser, requireRoles } from "./security";

const router = Router();
const subjects = new Set(["Amharic", "Math", "English", "Science"]);
function lessonShape(row: Record<string, unknown>) {
  return { id: Number(row.id), title: String(row.title), subject: String(row.subject), gradeLevel: String(row.grade_level), question: String(row.question), options: readOptions(row.options), correctAnswer: String(row.correct_answer), pronunciationWord: row.pronunciation_word ? String(row.pronunciation_word) : null, rewardCoins: Number(row.reward_coins), createdAt: row.created_at };
}
router.get("/", asyncRoute(async (req, res) => {
  const grade = typeof req.query.grade_level === "string" ? req.query.grade_level : "";
  const subject = typeof req.query.subject === "string" ? req.query.subject : "";
  const conditions: string[] = [];
  const params: string[] = [];
  if (grade) { conditions.push("grade_level = ?"); params.push(grade); }
  if (subject && subject !== "All") { if (!subjects.has(subject)) throw new ApiError(400, "Choose a supported subject."); conditions.push("subject = ?"); params.push(subject); }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const list = await rows<Record<string, unknown>>(`SELECT id, title, subject, grade_level, question, options, correct_answer, pronunciation_word, reward_coins, created_at FROM temari_lessons${where} ORDER BY id ASC`, params);
  res.json(list.map(lessonShape));
}));

router.post("/submit", authenticate, requireRoles("student"), asyncRoute(async (req, res) => {
  const studentId = Number(req.body?.student_id ?? req.temariUser?.id);
  const lessonId = Number(req.body?.lesson_id);
  const selectedOption = typeof req.body?.selected_option === "string" ? req.body.selected_option : "";
  if (!Number.isInteger(studentId) || !Number.isInteger(lessonId) || !selectedOption) throw new ApiError(400, "student_id, lesson_id, and selected_option are required.");
  if (studentId !== req.temariUser?.id) throw new ApiError(403, "You can only submit your own answers.");
  const outcome = await transaction(async (connection) => {
    const [studentRows] = await connection.execute("SELECT id FROM temari_users WHERE id = ? FOR UPDATE", [studentId]);
    if (!(studentRows as unknown[]).length) throw new ApiError(404, "Student account was not found.");
    const [lessonRows] = await connection.execute("SELECT id, correct_answer, reward_coins FROM temari_lessons WHERE id = ?", [lessonId]);
    const lesson = (lessonRows as Array<{ id: number; correct_answer: string; reward_coins: number }>)[0];
    if (!lesson) throw new ApiError(404, "That quest could not be found.");
    const correct = selectedOption === lesson.correct_answer;
    let earnedCoins = 0;
    if (correct) {
      const [progressRows] = await connection.execute("SELECT id FROM temari_progress WHERE student_id = ? AND lesson_id = ? FOR UPDATE", [studentId, lessonId]);
      if (!(progressRows as unknown[]).length) {
        await connection.execute("INSERT INTO temari_progress (student_id, lesson_id, score) VALUES (?, ?, 100)", [studentId, lessonId]);
        earnedCoins = Number(lesson.reward_coins);
        await connection.execute("UPDATE temari_users SET coins = coins + ? WHERE id = ?", [earnedCoins, studentId]);
      }
    }
    const [userRows] = await connection.execute("SELECT id, full_name, email, role, grade_level, coins, streak FROM temari_users WHERE id = ?", [studentId]);
    const user = (userRows as Array<Record<string, unknown>>)[0];
    return { correct, earnedCoins, correctAnswer: lesson.correct_answer, user: user ? publicUser(user) : null };
  });
  res.json(outcome);
}));

export default router;
