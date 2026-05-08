// Haftalık çarpana göre efektif blok havuzunu hesapla
export function step2Pool(multiplier: number): number {
  const DEFAULT_WEEKLY_BLOCKS = 28;
  // Ondalık blok olmaması için Math.floor kullan
  return Math.floor(DEFAULT_WEEKLY_BLOCKS * multiplier);
}
