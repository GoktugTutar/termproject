export type ExamType = 'quiz' | 'midterm' | 'final';
export type Difficulty = 1 | 2 | 3; // 1=kolay, 2=orta, 3=zor

export interface Lesson {
  id: string;
  userId: string;
  lessonName: string;
  difficulty: Difficulty;
  examDate: string; // ISO date string
  examType: ExamType;
  allocatedHours: number; // toplam çalışma saati hedefi
  remaining: number;      // kalan çalışma saati
  delay: number;          // gecikme katsayısı (0'dan başlar, artabilir)
  createdAt: string;
}
