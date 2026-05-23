export type WhatIfScenario =
  | 'daha_fazla_calis'
  | 'ders_durumu'
  | 'calisma_tarzi'
  | 'derse_odaklan'
  | 'gun_bos';

export interface WhatIfInput {
  scenario: WhatIfScenario;
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
  // 'ders_durumu' ve 'derse_odaklan' için
  focusLessonName?: string;
  focusLessonCompletion?: number; // 0-1
  focusLessonKeyfiDelayCount?: number;
  // 'gun_bos' için
  emptyDayName?: string; // örn. "Cuma"
  emptyDayBlockCount?: number;
  // Uyku & performans ilişkisi (profilde yeterli veri varsa)
  sleepMetrics?: {
    goodSleepCompletionRate: number;
    badSleepCompletionRate: number | null;
    goodSleepAvgStress: number | null;
    badSleepAvgStress: number | null;
  } | null;
}

const SCENARIO_LABELS: Record<WhatIfScenario, string> = {
  daha_fazla_calis: 'Daha fazla çalışırsam ne olur?',
  ders_durumu: 'Bu derste durumum nasıl?',
  calisma_tarzi: 'Nasıl çalışmak bana daha uygun görünüyor?',
  derse_odaklan: 'Bir derse daha fazla odaklanırsam ne olur?',
  gun_bos: 'O gün çalışamazsam ne olur?',
};

export function buildWhatIfPrompt(input: WhatIfInput): string {
  const lines: string[] = [];

  lines.push('Sen bir öğrenci çalışma takip sisteminde eğitim koçusun.');
  lines.push('Öğrencinin seçtiği senaryoyu veriye dayalı ama koç gibi — destekleyici, yargısız — açıklayacaksın.');
  lines.push('Planı değiştirme, sadece olası etkiyi ve uygulanabilir bir öneriyi açıkla.');
  lines.push('Türkçe yaz, 3-5 cümle, madde işareti kullanma.');
  lines.push('');

  lines.push(`Senaryo: "${SCENARIO_LABELS[input.scenario]}"`);
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

  // Uyku & performans ilişkisi
  if (input.sleepMetrics) {
    const s = input.sleepMetrics;
    const compDiff = s.badSleepCompletionRate !== null
      ? Math.round((s.goodSleepCompletionRate - (s.badSleepCompletionRate ?? 0)) * 100)
      : null;
    const stressDiff = (s.goodSleepAvgStress !== null && s.badSleepAvgStress !== null)
      ? (s.badSleepAvgStress - s.goodSleepAvgStress).toFixed(1)
      : null;

    if (compDiff !== null || stressDiff !== null) {
      lines.push('Uyku & performans ilişkisi (son 14 gün):');
      if (compDiff !== null) {
        lines.push(`- İyi uyuduğu günlerde tamamlama oranı %${Math.round(s.goodSleepCompletionRate * 100)}, kötü uyuduğu günlerde %${Math.round((s.badSleepCompletionRate ?? 0) * 100)} (fark: %${compDiff})`);
      }
      if (stressDiff !== null) {
        lines.push(`- İyi uyuduğu günlerde ortalama stres ${s.goodSleepAvgStress?.toFixed(1)}, kötü uyuduğu günlerde ${s.badSleepAvgStress?.toFixed(1)} (fark: ${stressDiff})`);
      }
      lines.push('');
    }
  }

  // Yaklaşan sınavlar
  if (input.upcomingExams.length > 0) {
    lines.push('Yaklaşan sınavlar (14 gün içinde):');
    for (const e of input.upcomingExams) {
      lines.push(`- ${e.lessonName}: ${e.daysLeft} gün kaldı, zorluk ${e.difficulty}/5`);
    }
    lines.push('');
  }

  // Senaryoya özel context
  switch (input.scenario) {
    case 'daha_fazla_calis':
      lines.push('Bağlam: Öğrenci mevcut tamamlama oranına bakarak daha fazla çalışmanın ne fark yaratacağını merak ediyor.');
      lines.push('Stres seviyesini göz önünde bulundurarak sürdürülebilirlik açısından değerlendir.');
      break;

    case 'ders_durumu':
      if (input.focusLessonName) {
        lines.push(`Odak ders: ${input.focusLessonName}`);
        if (input.focusLessonCompletion !== undefined) {
          lines.push(`Bu dersteki tamamlama oranı: %${Math.round(input.focusLessonCompletion * 100)}`);
        }
        if (input.focusLessonKeyfiDelayCount !== undefined && input.focusLessonKeyfiDelayCount > 0) {
          lines.push(`Erteleme sayısı: ${input.focusLessonKeyfiDelayCount} kez`);
        }
      }
      lines.push('Bu derste öğrencinin nerede durduğunu ve ne yapması gerektiğini net açıkla.');
      break;

    case 'calisma_tarzi':
      lines.push('Bağlam: Öğrenci tamamlama oranı ve istikrar verilerine göre hangi çalışma biçiminin (uzun-seyrek mi, kısa-sık mı) kendine daha uygun olduğunu merak ediyor.');
      lines.push('Veriyi yorumla ve somut bir öneri ver.');
      break;

    case 'derse_odaklan':
      if (input.focusLessonName) {
        lines.push(`Odaklanılmak istenen ders: ${input.focusLessonName}`);
      }
      lines.push('Bağlam: Bir derse daha fazla zaman ayırmanın diğer dersleri ve sınav riskini nasıl etkileyebileceğini açıkla.');
      if (input.upcomingExams.length > 1) {
        lines.push('Birden fazla sınav yakın olduğu için dengeyi vurgula.');
      }
      break;

    case 'gun_bos':
      if (input.emptyDayName) {
        lines.push(`Boş kalacak gün: ${input.emptyDayName}`);
        if (input.emptyDayBlockCount !== undefined) {
          lines.push(`O gün planlanmış blok sayısı: ${input.emptyDayBlockCount}`);
        }
      }
      lines.push('Bağlam: O günü tamamen boş bırakmanın haftalık plan üzerindeki olası etkisini açıkla.');
      lines.push('Telafi önerisi sun ama planı kendin değiştirme.');
      break;
  }

  return lines.join('\n');
}