/**
 * completionStatus values:
 *   null         → pending (not yet submitted)
 *   9999         → erken bitti (finished early — "inf")
 *   -9999        → hiç yapılmadı (missed — "-inf")
 *   # (positive) → tamamlandı (completed, value = hours spent)
 *   -# (negative)→ eksik (partial, |value| = hours actually done)
 *
 * hoursCompleted:
 *   actual study hours recorded; null while pending.
 */
export interface ChecklistLesson {
  lessonId: string;
  allocatedHours: number;
  hoursCompleted: number | null;
}

export interface IChecklist {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  lessons: ChecklistLesson[];
  submitted: boolean;
}
