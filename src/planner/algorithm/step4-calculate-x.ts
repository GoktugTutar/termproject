// Her ders için haftalık blok tahsisini hesapla (ADIM 4)

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

export interface LessonAllocation {
  lessonId: number;
  allocatedBlocks: number;
  effectiveBlocks: number;
}

// Her ders için haftalık blok miktarını delay ve difficulty'ye göre hesapla
export function step4CalculateX(
  lessons: Array<{
    id: number;
    difficulty: number;
    keyfiDelayCount: number;
    zorunluDelayCount: number;
    zorunluMissedBlocks: number;
    needsMoreTime: number;
  }>,
  effectiveBlocks: number,
): LessonAllocation[] {
  if (lessons.length === 0) return [];

  // Her ders için efektif ağırlık hesapla
  const weights = lessons.map((lesson) => {
    const totalDelay = lesson.keyfiDelayCount + lesson.zorunluDelayCount;
    const delayBonus = Math.min(totalDelay, 2);

    let effectiveWeight: number;
    if (totalDelay > 0) {
      // Delay varsa: zorluk + delay bonusu
      effectiveWeight = lesson.difficulty + delayBonus;
    } else {
      // Delay yoksa: needsMoreTime etkisi
      effectiveWeight = Math.max(1, lesson.difficulty + lesson.needsMoreTime);
    }
    return effectiveWeight;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    return lessons.map((l) => ({ lessonId: l.id, allocatedBlocks: 0, effectiveBlocks: 0 }));
  }

  // Oransal dağıtım → largest remainder ile tam sayıya çevir
  const proportional = weights.map((w) => (effectiveBlocks * w) / totalWeight);
  const allocated = largestRemainder(proportional, effectiveBlocks);

  // Zorunlu telafi bloğu ekle (önceki haftadan kalan eksikler)
  return lessons.map((lesson, i) => {
    const base = allocated[i];
    const extra = lesson.zorunluDelayCount > 0 ? lesson.zorunluMissedBlocks : 0;
    return {
      lessonId: lesson.id,
      allocatedBlocks: base,
      effectiveBlocks: base + extra,
    };
  });
}
