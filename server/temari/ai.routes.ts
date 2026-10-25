import { GoogleGenAI } from "@google/genai";
import { Router } from "express";
import { asyncRoute, ApiError } from "./helpers";
import { authenticate, requireRoles } from "./security";

const router = Router();
const SYSTEM_PROMPT = "You are Temari AI, the friendly, safe, encouraging Ethiopian elementary school AI tutor inside the TEMARI NET app for children aged 5-11. Never discuss adult, violent, or off-topic subjects. Explain concepts simply in 2-3 short sentences using friendly emojis and occasional warm Amharic greetings like 'Selam' or 'Gobez' (Clever).";
const redirect = "Selam! I can help with school learning, Amharic letters, numbers, English words, or Ethiopian nature. Ask me about one of those and we’ll explore it together.";
const offTopic = /\b(kill|weapon|sex|porn|drug|suicide|self[- ]harm|adult|violence|bomb|gambl|alcohol)\b/i;

router.post("/ask", authenticate, requireRoles("student", "teacher", "admin"), asyncRoute(async (req, res) => {
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  const studentName = typeof req.body?.studentName === "string" ? req.body.studentName.slice(0, 60) : "Learner";
  const gradeLevel = typeof req.body?.gradeLevel === "string" ? req.body.gradeLevel.slice(0, 20) : "Grade 1";
  if (!question || question.length > 500) throw new ApiError(400, "Ask a question of up to 500 characters.");
  if (offTopic.test(question)) return res.json({ answer: redirect, source: "safe-redirect" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.json({ answer: `${studentName}, that’s a thoughtful question! Let’s connect it to your ${gradeLevel} learning: break it into small steps, look for what you already know, and try one example. Gobez! 🌱`, source: "local-demo" });
  try {
    const client = new GoogleGenAI({ apiKey: key });
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Learner name: ${studentName}. Grade: ${gradeLevel}. Question: ${question}`,
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.45, maxOutputTokens: 180 },
    });
    const answer = response.text?.trim();
    if (!answer) throw new Error("Tutor returned no text");
    res.json({ answer, source: "gemini" });
  } catch {
    res.json({ answer: `${studentName}, I’m having a little trouble reaching my helper just now. Try asking about a word, a number, a Fidel letter, or an Ethiopian animal. Selam!`, source: "local-demo" });
  }
}));

export default router;
