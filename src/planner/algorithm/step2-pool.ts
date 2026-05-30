// Haftalık çarpana göre efektif blok havuzunu hesapla
export function step2Pool(multiplier: number, weeklyBlocks: number = 28): number {
  // Ondalık blok olmaması için Math.floor kullan
  return Math.floor(weeklyBlocks * multiplier);
}
