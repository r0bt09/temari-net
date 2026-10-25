export const TEMARI_COLORS = {
  emerald: "#146B54",
  emeraldDeep: "#104B3D",
  parchment: "#FFF9EE",
  ink: "#20352E",
  muted: "#68766F",
  saffron: "#F2B84B",
  coral: "#E97562",
  leaf: "#DCEBDD",
  border: "#E7DDCB",
  white: "#FFFFFF",
};

export const GRADE_LEVELS = ["Pre-K", "Grade 1", "Grade 2", "Grade 3", "Grade 4"] as const;
export const SUBJECTS = ["All", "Amharic", "Math", "English", "Science"] as const;
export type TemariGrade = (typeof GRADE_LEVELS)[number];
export type TemariSubject = Exclude<(typeof SUBJECTS)[number], "All">;

export type Lesson = {
  id: number;
  title: string;
  subject: TemariSubject;
  gradeLevel: string;
  question: string;
  options: string[];
  correctAnswer: string;
  pronunciationWord?: string | null;
  rewardCoins: number;
};

export const SAMPLE_LESSONS: Lesson[] = [
  { id: 1, title: "Meet the Fidel: ሀ", subject: "Amharic", gradeLevel: "Pre-K", question: "Which Fidel makes the sound ‘hä’?", options: ["ሀ", "ለ", "መ", "ሐ"], correctAnswer: "ሀ", pronunciationWord: "ሀ", rewardCoins: 15 },
  { id: 2, title: "Meet the Fidel: ለ", subject: "Amharic", gradeLevel: "Grade 1", question: "Choose the Fidel ‘lä’. ", options: ["ሀ", "ለ", "ሐ", "መ"], correctAnswer: "ለ", pronunciationWord: "ለ", rewardCoins: 15 },
  { id: 3, title: "Count the Birr", subject: "Math", gradeLevel: "Grade 1", question: "You have 2 birr and find 3 more. How many birr now?", options: ["4 birr", "5 birr", "6 birr", "3 birr"], correctAnswer: "5 birr", pronunciationWord: "birr", rewardCoins: 15 },
  { id: 4, title: "Fruit Basket", subject: "Math", gradeLevel: "Grade 2", question: "There are 4 mangoes and 2 oranges. How many fruits?", options: ["5", "6", "7", "8"], correctAnswer: "6", pronunciationWord: "mango", rewardCoins: 15 },
  { id: 5, title: "English Word Explorer", subject: "English", gradeLevel: "Grade 1", question: "Which word names a place where we read books?", options: ["River", "Library", "Mountain", "Market"], correctAnswer: "Library", pronunciationWord: "library", rewardCoins: 15 },
  { id: 6, title: "Wildlife Watch", subject: "Science", gradeLevel: "Grade 3", question: "Which animal is native to Ethiopia’s highlands?", options: ["Walia ibex", "Polar bear", "Kangaroo", "Penguin"], correctAnswer: "Walia ibex", pronunciationWord: "Walia ibex", rewardCoins: 20 },
];
