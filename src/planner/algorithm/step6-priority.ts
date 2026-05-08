// Dersleri sınava kalan gün ve delay durumuna göre öncelik sıralamasına koy (ADIM 6)
export type PriorityLevel = 'KRITIK' | 'YUKSEK' | 'ORTA' | 'DUSUK';

export interface LessonPriority {
  lessonId: number;
  priority: PriorityLevel;
  priorityScore: number;
  slottedMode: boolean;
}

// Sınava kalan güne göre öncelik seviyesi belirle
function uToPriority(u: number): PriorityLevel {
  if (u <= 3) return 'KRITIK';
  if (u <= 7) return 'YUKSEK';
  if (u <= 14) return 'ORTA';
  return 'DUSUK';
}

// Öncelik seviyesini sayısal puana çevir
function priorityScore(level: PriorityLevel): number {
  switch (level) {
    case 'KRITIK': return 4;
    case 'YUKSEK': return 3;
    case 'ORTA': return 2;
    case 'DUSUK': return 1;
  }
}

// Derse ait en yakın sınava kalan gün sayısını hesapla
function daysUntilExam(lesson: { exams: Array<{ examDate: Date }> }, now: Date): number {
  const exams = lesson.exams || [];
  if (exams.length === 0) return 999;
  const future = exams
    .map((e: any) => Math.ceil((new Date(e.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    .filter((d: number) => d >= 0);
  return future.length > 0 ? Math.min(...future) : 999;
}

// Tüm dersleri öncelik skoruna göre sırala
export function step6Priority(
  lessons: Array<{
    id: number;
    difficulty: number;
    keyfiDelayCount: number;
    zorunluDelayCount: number;
    exams: Array<{ examDate: Date }>;
  }>,
  now: Date,
): LessonPriority[] {
  return lessons
    .map((lesson) => {
      const u = daysUntilExam(lesson, now);
      const totalDelay = lesson.keyfiDelayCount + lesson.zorunluDelayCount;

      let level = uToPriority(u);

      // 3+ delay → bir kademe yukarı (KRITIK üzerinde çıkamaz)
      if (totalDelay >= 3) {
        const levels: PriorityLevel[] = ['DUSUK', 'ORTA', 'YUKSEK', 'KRITIK'];
        const idx = levels.indexOf(level);
        if (idx < levels.length - 1) level = levels[idx + 1];
      }

      // keyfiDelay > 0 → slotlu mod (aynı ders 3 gün üst üste yerleştirilemez)
      const slottedMode = lesson.keyfiDelayCount > 0;

      return {
        lessonId: lesson.id,
        priority: level,
        // Önce öncelik seviyesi, sonra zorluk derecesi
        priorityScore: priorityScore(level) * 10 + lesson.difficulty,
        slottedMode,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}
