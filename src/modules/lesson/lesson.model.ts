export interface ILesson {
  id: string;
  userId: string;
  name: string;
  credit: number;
  difficulty: number; // D: 1–5 (zorluk katsayısı)
  vizeDate: Date | null;
  finalDate: Date | null;
  homeworkDeadlines: string[]; // ISO date strings
  semester: number;
  delayCount: number; // B: gecikme sayısı
}
