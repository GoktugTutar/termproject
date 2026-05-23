// Dersleri sınava kalan gün ve delay durumuna göre öncelik sıralamasına koy (ADIM 6)
export type PriorityLevel = 'KRITIK' | 'YUKSEK' | 'ORTA' | 'DUSUK';

export interface LessonPriority {
  lessonId: number;
  priority: PriorityLevel;
  priorityScore: number;
  slottedMode: boolean;
}

function uToPriority(u: number): PriorityLevel {
  if (u <= 3) return 'KRITIK';
  if (u <= 7) return 'YUKSEK';
  if (u <= 14) return 'ORTA';
  return 'DUSUK';
}

function priorityScore(level: PriorityLevel): number {
  switch (level) {
    case 'KRITIK': return 4;
    case 'YUKSEK': return 3;
    case 'ORTA': return 2;
    case 'DUSUK': return 1;
  }
}

function daysUntilExam(lesson: { exams: Array<{ examDate: Date }> }, now: Date): number {
  const exams = lesson.exams || [];
  if (exams.length === 0) return 999;
  const future = exams
    .map((e: any) => Math.ceil((new Date(e.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    .filter((d: number) => d >= 0);
  return future.length > 0 ? Math.min(...future) : 999;
}

export function step6Priority(
  lessons: Array<{
    id: number;
    difficulty: number;
    keyfiDelayCount: number;
    zorunluDelayCount: number;
    exams: Array<{ examDate: Date }>;
  }>,
  now: Date,
  // LessonPlanOverride'dan gelen boost map: lessonId → priorityBoost
  priorityBoosts: Record<number, number> = {},
): LessonPriority[] {
  return lessons
    .map((lesson) => {
      const u = daysUntilExam(lesson, now);
      const totalDelay = lesson.keyfiDelayCount + lesson.zorunluDelayCount;

      let level = uToPriority(u);

      // 3+ delay → bir kademe yukarı
      if (totalDelay >= 3) {
        const levels: PriorityLevel[] = ['DUSUK', 'ORTA', 'YUKSEK', 'KRITIK'];
        const idx = levels.indexOf(level);
        if (idx < levels.length - 1) level = levels[idx + 1];
      }

      const slottedMode = lesson.keyfiDelayCount > 0;

      // LessonPlanOverride'dan gelen priority boost — ham skora eklenir
      const boost = priorityBoosts[lesson.id] ?? 0;

      return {
        lessonId: lesson.id,
        priority: level,
        priorityScore: priorityScore(level) * 10 + lesson.difficulty + boost,
        slottedMode,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}