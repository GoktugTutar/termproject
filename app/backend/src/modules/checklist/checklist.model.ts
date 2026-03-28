/**
 * Checklist durumu:
 * 'pending'   → henüz girilmedi
 * 'early'     → erken bitti  (-# olarak gösterilir, R < 0)
 * 'completed' → tamamlandı   (R = 0)
 * 'incomplete'→ eksik        (# olarak gösterilir, R > 0)
 * 'not_done'  → tamamlanmadı (inf olarak gösterilir)
 */
export type ChecklistStatus = 'pending' | 'early' | 'completed' | 'incomplete' | 'not_done';

export interface ChecklistItem {
  id: string;
  userId: string;
  lessonId: string;
  lessonName: string;
  date: string;              // YYYY-MM-DD
  plannedHours: number;      // X (heuristikten hesaplanan)
  actualHours: number | null;// Kullanıcının girdiği gerçek süre
  status: ChecklistStatus;
  remaining: number | null;  // R = plannedHours - actualHours (negatif = erken)
  createdAt: Date | string;
}
