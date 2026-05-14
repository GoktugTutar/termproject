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

  // Ders sınıfına göre haftalık fiziksel üst sınırlar:
  // AGIR (diff>=4): art arda gün kuralı → max 4 blok/hafta
  // ORTA (diff 3):  günlük 2 blok, 5 gün → max 8 blok/hafta
  // HAFIF (diff<=2): günlük 2 blok, 5 gün → max 6 blok/hafta
  const weeklyMax = (difficulty: number) => {
    if (difficulty >= 4) return 4;
    if (difficulty === 3) return 8;
    return 6;
  };

  let overflow = 0;
  const capped = allocated.map((blocks, i) => {
    const max = weeklyMax(lessons[i].difficulty);
    if (blocks > max) {
      overflow += blocks - max;
      return max;
    }
    return blocks;
  });

  // Taşan blokları kalan kapasitesi olan derslere difficulty oranında dağıt
  if (overflow > 0) {
    const hasCapacity = lessons
      .map((l, i) => ({ i, difficulty: l.difficulty, slack: weeklyMax(l.difficulty) - capped[i] }))
      .filter(({ slack }) => slack > 0);
    const totalSlack = hasCapacity.reduce((s, { slack }) => s + slack, 0);
    let toDistribute = Math.min(overflow, totalSlack);
    for (const { i, slack } of hasCapacity) {
      const share = Math.round((slack / totalSlack) * toDistribute);
      capped[i] += Math.min(share, slack);
    }
  }

  // Zorunlu telafi bloğu ekle (önceki haftadan kalan eksikler)
  return lessons.map((lesson, i) => {
    const base = capped[i];
    const extra = lesson.zorunluDelayCount > 0 ? lesson.zorunluMissedBlocks : 0;
    return {
      lessonId: lesson.id,
      allocatedBlocks: base,
      effectiveBlocks: base + extra,
    };
  });
}