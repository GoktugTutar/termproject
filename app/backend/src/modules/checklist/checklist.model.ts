export interface ChecklistItem {
  id: string;
  userId: string;
  lessonId: string;
  lessonName: string;
  plannedHours: number;
  actualHours: number;
  completed: boolean;
  date: string; // ISO date string (YYYY-MM-DD)
  createdAt: string;
}
