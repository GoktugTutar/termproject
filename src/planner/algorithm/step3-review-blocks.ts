// Sınav tekrar bloklarını hesapla ve hangi günlere atanacağını belirle
export interface ReviewBlock {
  lessonId: number;
  date: Date;
  blocks: number;
}

// reviewWindowStart: tekrar bloğu yerleştirilebilecek en erken tarih.
// Varsayılan weekStart'tır; hafta öncesi Cmt/Paz için weekStart-2 geçilebilir.
export function step3ReviewBlocks(
  lessons: Array<{
    id: number;
    difficulty: number;
    exams: Array<{ examDate: Date }>;
  }>,
  effectiveBlocks: number,
  weekStart: Date,
  weekEnd: Date,
  reviewWindowStart?: Date,
): { reviewBlocks: ReviewBlock[]; reservedByLesson: Record<number, number> } {
  const totalDifficulty = lessons.reduce((sum, l) => sum + l.difficulty, 0);
  const reviewBlocks: ReviewBlock[] = [];
  const reservedByLesson: Record<number, number> = {};
  const windowStart = reviewWindowStart ?? weekStart;

  // Sonraki haftanın ilk 2 gününe bak: o sınavların tekrar bloğu bu haftaya sığabilir
  const lookaheadEnd = new Date(weekEnd);
  lookaheadEnd.setDate(lookaheadEnd.getDate() + 2);

  for (const lesson of lessons) {
    // Bu hafta + sonraki 2 gün içinde sınavı olan dersler için tekrar bloğu oluştur
    const examsThisWeek = lesson.exams.filter((e) => {
      const d = new Date(e.examDate);
      return d >= weekStart && d <= lookaheadEnd;
    });

    if (examsThisWeek.length === 0) continue;

    const examDate = new Date(examsThisWeek[0].examDate);
    const reviewBase = totalDifficulty > 0
      ? (effectiveBlocks * lesson.difficulty) / totalDifficulty
      : 0;

    let totalReserved = 0;

    if (lesson.difficulty < 4) {
      // Zorluk < 4: Sınav günü -1'e %25 tekrar bloğu
      const day1 = new Date(examDate);
      day1.setDate(day1.getDate() - 1);
      // Üst sınır weekEnd: tekrar bloğunu bir sonraki haftaya taşıma
      if (day1 >= windowStart && day1 <= weekEnd) {
        const blocks = Math.max(1, Math.min(4, Math.round(reviewBase * 0.25)));
        reviewBlocks.push({ lessonId: lesson.id, date: day1, blocks });
        totalReserved += blocks;
      }
    } else {
      // Zorluk >= 4: Sınav günü -1 ve -2'ye %20'şer tekrar bloğu
      const day1 = new Date(examDate);
      day1.setDate(day1.getDate() - 1);
      if (day1 >= windowStart && day1 <= weekEnd) {
        const blocks = Math.max(1, Math.min(4, Math.round(reviewBase * 0.20)));
        reviewBlocks.push({ lessonId: lesson.id, date: day1, blocks });
        totalReserved += blocks;
      }

      const day2 = new Date(examDate);
      day2.setDate(day2.getDate() - 2);
      if (day2 >= windowStart && day2 <= weekEnd) {
        const blocks = Math.max(1, Math.min(4, Math.round(reviewBase * 0.20)));
        reviewBlocks.push({ lessonId: lesson.id, date: day2, blocks });
        totalReserved += blocks;
      }
    }

    if (totalReserved > 0) {
      reservedByLesson[lesson.id] = totalReserved;
    }
  }

  return { reviewBlocks, reservedByLesson };
}
