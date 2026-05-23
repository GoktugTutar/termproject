export interface CoachPromptInput {
  profile: {
    completionRate7d: number;
    avgStress7d: number;
    consistencyScore: number;
  } | null;
  upcomingExams: Array<{
    lessonName: string;
    daysLeft: number;
    difficulty: number;
  }>;
  weeklyFeedback: 'cok_yogundu' | 'tam_uygundu' | 'yetersizdi' | null;
  thisWeekBlocks: Array<{
    lessonName: string;
    blockCount: number;
    isReview: boolean;
  }>;
  // Sık ertelenen dersler
  delayedLessons: Array<{
    lessonName: string;
    delayCount: number;
  }>;
}

export function buildCoachPrompt(input: CoachPromptInput): string {
  const lines: string[] = [];

  lines.push('Sen bir öğrenci çalışma takip sisteminde kişisel eğitim koçusun.');
  lines.push('Öğrencinin günlük durumuna bakarak kısa, motive edici ve uygulanabilir bir koçluk mesajı üreteceksin.');
  lines.push('Yargılama, eleştiri yok. Türkçe yaz. 2-4 cümle. Madde işareti kullanma.');
  lines.push('');

  // Profil
  if (input.profile) {
    const p = input.profile;
    lines.push('Öğrencinin son 7 günlük durumu:');
    lines.push(`- Tamamlama oranı: %${Math.round(p.completionRate7d * 100)}`);
    lines.push(`- Ortalama stres: ${p.avgStress7d.toFixed(1)} / 5`);
    lines.push(`- Çalışma istikrarı: %${Math.round(p.consistencyScore * 100)}`);
    lines.push('');
  }

  // Bu haftaki bloklar
  if (input.thisWeekBlocks.length > 0) {
    const totalBlocks = input.thisWeekBlocks.reduce((s, b) => s + b.blockCount, 0);
    const lessonSummary = input.thisWeekBlocks
      .filter((b) => !b.isReview)
      .map((b) => `${b.lessonName} (${b.blockCount} blok)`)
      .join(', ');
    lines.push(`Bu haftaki plan: toplam ${totalBlocks} blok — ${lessonSummary}`);
    lines.push('');
  }

  // Geçen hafta feedback
  if (input.weeklyFeedback) {
    const feedbackMap = {
      cok_yogundu: 'Geçen haftayı çok yoğun buldu.',
      tam_uygundu: 'Geçen haftayı dengeli buldu.',
      yetersizdi: 'Geçen haftayı yetersiz buldu.',
    };
    lines.push(`Geçen hafta değerlendirmesi: ${feedbackMap[input.weeklyFeedback]}`);
    lines.push('');
  }

  // Yaklaşan sınavlar
  if (input.upcomingExams.length > 0) {
    lines.push('Yaklaşan sınavlar:');
    for (const e of input.upcomingExams) {
      lines.push(`- ${e.lessonName}: ${e.daysLeft} gün kaldı, zorluk ${e.difficulty}/5`);
    }
    lines.push('');
  }

  // Sık ertelenen dersler
  if (input.delayedLessons.length > 0) {
    lines.push('Sık ertelenen dersler:');
    for (const d of input.delayedLessons) {
      lines.push(`- ${d.lessonName}: ${d.delayCount} kez ertelendi`);
    }
    lines.push('');
  }

  lines.push('Yukarıdaki verilere dayanarak öğrenciye bugün için kısa bir koçluk mesajı yaz.');
  lines.push('Öncelikli odak noktasını belirt (sınav riski, stres, erteleme — hangisi öne çıkıyorsa).');

  return lines.join('\n');
}