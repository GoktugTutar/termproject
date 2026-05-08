// Tükenmişlik sinyali: son 7 günde tamamlanan/planlanan blok oranına göre max blok azalt
export interface BurnoutResult {
  maxBlocksPerSession: number;
  burnoutDetected: boolean;
}

export function step0Burnout(
  completedBlocks: number,
  plannedBlocks: number,
  currentMax: number,
): BurnoutResult {
  // Planlanan blok yoksa tükenmişlik kontrolü yapma
  if (plannedBlocks === 0) {
    return { maxBlocksPerSession: currentMax, burnoutDetected: false };
  }

  const weekCompletionRate = completedBlocks / plannedBlocks;

  // Tamamlama oranı %70'in altındaysa max blok miktarını azalt
  if (weekCompletionRate < 0.7) {
    return {
      maxBlocksPerSession: Math.max(1, currentMax - 1),
      burnoutDetected: true,
    };
  }

  return { maxBlocksPerSession: currentMax, burnoutDetected: false };
}
