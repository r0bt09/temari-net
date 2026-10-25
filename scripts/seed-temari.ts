import { temariPool } from "../server/temari/db";

const lessons = [
  { title: "Amharic Fidel: Meet ሀ", subject: "Amharic", grade: "Pre-K", question: "Which Fidel letter is shown here? ሀ", options: ["ሀ", "ለ", "ሐ", "መ"], answer: "ሀ", word: "ሀ" },
  { title: "Amharic Fidel: Find ለ", subject: "Amharic", grade: "Grade 1", question: "Tap the Fidel letter ለ.", options: ["ሀ", "ለ", "ሐ", "መ"], answer: "ለ", word: "ለ" },
  { title: "Amharic Fidel: Spot ሐ and መ", subject: "Amharic", grade: "Grade 1", question: "Which letter comes after ሐ in this set: ሀ, ለ, ሐ, መ?", options: ["ሀ", "ለ", "ሐ", "መ"], answer: "መ", word: "መ" },
  { title: "Math: Birr at the Fruit Stand", subject: "Math", grade: "Grade 2", question: "A banana costs 3 birr and an orange costs 2 birr. How many birr altogether?", options: ["4 birr", "5 birr", "6 birr", "7 birr"], answer: "5 birr", word: "birr" },
  { title: "English: Choose a Kind Word", subject: "English", grade: "Grade 2", question: "Which word is a kind way to offer support to a friend?", options: ["help", "hide", "push", "shout"], answer: "help", word: "help" },
  { title: "Science: Ethiopian Wildlife and Habitats", subject: "Science", grade: "Grade 3", question: "Which Ethiopian animal lives on highland grasslands?", options: ["Gelada", "Dolphin", "Penguin", "Camel"], answer: "Gelada", word: "Gelada" },
] as const;

async function main() {
  const pool = temariPool();
  let added = 0;
  let existing = 0;
  try {
    for (const lesson of lessons) {
      const [found] = await pool.execute("SELECT id FROM temari_lessons WHERE title = ? AND grade_level = ? LIMIT 1", [lesson.title, lesson.grade]);
      if ((found as unknown[]).length) { existing += 1; continue; }
      await pool.execute(
        "INSERT INTO temari_lessons (title, subject, grade_level, question, options, correct_answer, pronunciation_word, reward_coins) VALUES (?, ?, ?, ?, ?, ?, ?, 15)",
        [lesson.title, lesson.subject, lesson.grade, lesson.question, JSON.stringify(lesson.options), lesson.answer, lesson.word],
      );
      added += 1;
    }
    console.info(`TEMARI curriculum seed complete: ${added} added; ${existing} already present.`);
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error("TEMARI curriculum seeding failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
