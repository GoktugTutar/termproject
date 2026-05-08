// Haftalık blokları günlere dağıt ve gün bazlı session limitlerini belirle (ADIM 5)

// Largest-remainder yöntemiyle oransal dağıtımı tam sayıya çevir
function largestRemainder(weights: number[], total: number): number[] {
  const floors = weights.map((w) => Math.floor(w));
  const remainders = weights.map((w, i) => ({ index: i, remainder: w - floors[i] }));
  const remaining = total - floors.reduce((a, b) => a + b, 0);
  remainders.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remaining; i++) {
    floors[remainders[i].index] += 1;
  }
  return floors;
}

export interface DayConfig {
  date: Date;
  dayOfWeek: number; // 1=Pzt...7=Paz
  maxBlocks: number;
  maxSessions: number;
  maxBlocksPerSession: number;
  avgFatigue: number;
  isCokYorucu: boolean;
  isRahat: boolean;
}

// Günlere blok dağıtımı ve session sınırlarını hesapla
export function step5DayDistribution(
  effectiveBlocks: number,
  weekDays: Array<{ date: Date; dayOfWeek: number; busySlots: Array<{ fatigueLevel: number }> }>,
  studyStyle: string,
  maxBlocksPerSessionFromBurnout: number,
): DayConfig[] {
  // Her gün için ortalama yorgunluk hesapla (busy slot yoksa 1)
  const dayFatigue = weekDays.map((day) => {
    if (day.busySlots.length === 0) return 1;
    const sum = day.busySlots.reduce((a, b) => a + b.fatigueLevel, 0);
    return sum / day.busySlots.length;
  });

  // Gün ağırlığı: yorgunluk azaldıkça ağırlık artar
  const weights = dayFatigue.map((f) => 6 - f);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let dayBlocks: number[];
  if (totalWeight === 0) {
    dayBlocks = weekDays.map(() => 0);
  } else {
    const proportional = weights.map((w) => (effectiveBlocks * w) / totalWeight);
    dayBlocks = largestRemainder(proportional, effectiveBlocks);
  }

  return weekDays.map((day, i) => {
    const avgFatigue = dayFatigue[i];
    const isCokYorucu = avgFatigue >= 4;
    const isRahat = avgFatigue <= 2;

    let maxSessions: number;
    let maxBlocksPerSession: number;

    // Study style kurallarına göre session yapısını belirle
    switch (studyStyle) {
      case 'deep_focus':
        maxSessions = 1;
        maxBlocksPerSession = Math.min(4, maxBlocksPerSessionFromBurnout);
        break;
      case 'distributed':
        maxSessions = 3;
        maxBlocksPerSession = Math.min(2, maxBlocksPerSessionFromBurnout);
        break;
      default: // normal
        maxSessions = 2;
        maxBlocksPerSession = Math.min(3, maxBlocksPerSessionFromBurnout);
        break;
    }

    // Çok yorucu gün: maksimum 1 session
    if (isCokYorucu) maxSessions = 1;

    const maxBlocks = maxSessions * maxBlocksPerSession;

    return {
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      maxBlocks: Math.min(dayBlocks[i], maxBlocks),
      maxSessions,
      maxBlocksPerSession,
      avgFatigue,
      isCokYorucu,
      isRahat,
    };
  });
}
