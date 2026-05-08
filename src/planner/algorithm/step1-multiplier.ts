// Haftalık geri bildirime göre sonraki haftanın blok çarpanını belirle
export function step1Multiplier(weekloadFeedback: string | null): number {
  switch (weekloadFeedback) {
    case 'cok_yogundu':
      // Program çok yoğundu → %15 azalt
      return 0.85;
    case 'yetersizdi':
      // Program yetersizdi → %10 artır
      return 1.10;
    case 'tam_uygundu':
    default:
      // Varsayılan: değişiklik yok
      return 1.00;
  }
}
