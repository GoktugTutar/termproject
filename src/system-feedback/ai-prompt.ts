// Sistemin topladığı verileri Claude Haiku için prompt metnine dönüştür

export interface SystemFeedbackContext {
  // Tetiklenen mesajlar (system-feedback.service.ts'ten gelen)
  triggeredMessages: Array<{
    type: string;
    message: string;
    suggestion: string;
  }>;

  // Kullanıcı profili
  studentProfile: {
    completionRate7d: number;
    avgStress7d: number;
    avgFatigue7d: number;
    consistencyScore: number;
  } | null;

  // Geçen haftanın genel yük değerlendirmesi
  lastWeekloadFeedback: 'cok_yogundu' | 'tam_uygundu' | 'yetersizdi' | null;

  // Planner'dan gelen anlık context
  burnoutDetected: boolean;
  programZorlastu: boolean;
}

/**
 * Ham veriyi Claude Haiku için prompt string'ine çevir.
 *
 * AI'ın görevi:
 * - Tetiklenen mesajları birleştirip kullanıcıya tek, tutarlı bir metin üretmek.
 * - Mesaj yoksa sessiz kalmak (boş string döner, frontend göstermez).
 * - Türkçe, kısa, motive edici veya uyarıcı — asla yargılayıcı değil.
 */
export function buildSystemFeedbackPrompt(context: SystemFeedbackContext): string {
  // Tetiklenmiş mesaj yoksa prompt üretme
  if (context.triggeredMessages.length === 0) return '';

  const lines: string[] = [];

  // ── Sistem tespitleri ──────────────────────────────────────────────────
  lines.push('Aşağıda bir öğrenci çalışma takip sisteminin bu hafta için ürettiği tespitler var:');
  lines.push('');

  for (const msg of context.triggeredMessages) {
    lines.push(`- [${msg.type}] ${msg.message} → Öneri: ${msg.suggestion}`);
  }

  lines.push('');

  // ── Öğrenci profili (varsa) ────────────────────────────────────────────
  if (context.studentProfile) {
    const p = context.studentProfile;
    lines.push('Öğrencinin son 7 günlük genel durumu:');
    lines.push(`- Tamamlama oranı: %${Math.round(p.completionRate7d * 100)} (planlanan blokların ne kadarı tamamlandı)`);
    lines.push(`- Ortalama stres: ${p.avgStress7d.toFixed(1)} / 5`);
    lines.push(`- Ortalama yorgunluk: ${p.avgFatigue7d.toFixed(1)} / 5`);
    lines.push(`- Çalışma istikrarı: %${Math.round(p.consistencyScore * 100)} (her gün az da olsa çalışıyor mu — düzenlilik ölçüsü)`);
    lines.push('');
  }

  // ── Ek bağlam ──────────────────────────────────────────────────────────
  const extraContext: string[] = [];

  if (context.burnoutDetected) {
    extraContext.push('Bu haftaki program hafifletildi (tükenmişlik sinyali alındı).');
  }
  if (context.programZorlastu) {
    extraContext.push('Bazı zor dersler yoğun günlere taşınmak zorunda kalındı.');
  }
  if (context.lastWeekloadFeedback === 'cok_yogundu') {
    extraContext.push('Öğrenci geçen haftayı çok yoğun olarak değerlendirdi.');
  } else if (context.lastWeekloadFeedback === 'yetersizdi') {
    extraContext.push('Öğrenci geçen haftayı yetersiz olarak değerlendirdi.');
  }

  if (extraContext.length > 0) {
    lines.push('Ek bağlam:');
    for (const ctx of extraContext) {
      lines.push(`- ${ctx}`);
    }
    lines.push('');
  }

  // ── Görev tanımı ───────────────────────────────────────────────────────
  lines.push('Görevin:');
  lines.push(
    'Yukarıdaki tespitleri öğrenciye yönelik tek, akıcı bir Türkçe mesaja dönüştür. ' +
    'Mesaj kısa olsun (2-4 cümle), motive edici veya uyarıcı bir tonda yazılsın, ' +
    'asla yargılayıcı veya eleştirici olmasın. ' +
    'Tespitlerde birden fazla ders varsa hepsini tek mesajda birleştir. ' +
    'Sadece mesaj metnini yaz — başlık, madde işareti veya açıklama ekleme.',
  );

  return lines.join('\n');
}