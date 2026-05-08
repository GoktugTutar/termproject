// Hafta içi yeniden hesaplama: geçmiş günler kilitlenir, kalan blokları hesapla (ADIM 9)
export function step9Recalculate(
  lessonAllocations: Record<number, number>,
  completedBlocksByLesson: Record<number, number>,
): Record<number, number> {
  const remaining: Record<number, number> = {};

  for (const [lessonIdStr, allocated] of Object.entries(lessonAllocations)) {
    const lessonId = parseInt(lessonIdStr);
    const completed = completedBlocksByLesson[lessonId] ?? 0;
    // Tamamlanan blokları çıkar, pozitif olanları döndür
    const left = allocated - completed;
    if (left > 0) {
      remaining[lessonId] = left;
    }
  }

  return remaining;
}
