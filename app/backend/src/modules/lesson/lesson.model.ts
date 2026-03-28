export type DeadlineType = 'midterm' | 'final' | 'homework';

export interface Deadline {
  type: DeadlineType;
  date: string;    // ISO date (YYYY-MM-DD)
  label?: string;  // Ör: "HW1", "Midterm 1"
}

export interface Lesson {
  id: string;
  userId: string;
  lessonName: string;
  difficulty: number;      // D = Kredisi-zorluk (1-5)
  deadlines: Deadline[];   // Vize, final ve homework deadlineleri
  semester: string;        // Aldığı dönem (örn. "2024-2025 Bahar")
  delay: number;           // B = gecikme sayacı
  createdAt: Date | string;
}
