// Dersleri gün sınıfıyla eşleştirerek boş zaman pencerelerine yerleştir (ADIM 8)

import { DayConfig } from './step5-day-distribution';

export type LessonClass = 'AGIR' | 'ORTA' | 'HAFIF';
export type DayClass = 'rahat' | 'normal' | 'yorucu';

export interface TimeWindow {
  start: number; // dakika cinsinden
  end: number;
}

export interface PlacedBlock {
  lessonId: number;
  date: Date;
  startMin: number;
  endMin: number;
  blockCount: number;
  isReview: boolean;
  waveUsed?: 1 | 2 | 3 | 4; // hangi dalganın yerleştirdiği (review blokları için opsiyonel)
}

export type ProgramLevel = 'normal' | 'busy' | 'very_busy';

// Her ders sınıfı için tercih edilen gün sınıfı sırası
const DAY_PREFERENCE: Record<LessonClass, DayClass[]> = {
  AGIR:  ['rahat', 'normal', 'yorucu'],
  ORTA:  ['normal', 'rahat', 'yorucu'],
  HAFIF: ['yorucu', 'normal', 'rahat'],
};

// Tercih edilen çalışma saatini dakika aralığına çevir
function getPreferredRange(preferredStudyTime: string): { start: number; end: number } {
  switch (preferredStudyTime) {
    case 'morning':   return { start: 8 * 60,  end: 11 * 60 };
    case 'afternoon': return { start: 12 * 60, end: 15 * 60 };
    case 'evening':   return { start: 18 * 60, end: 21 * 60 };
    case 'night':     return { start: 21 * 60, end: 24 * 60 };
    default:          return { start: 8 * 60,  end: 24 * 60 };
  }
}

// Kullanılan bloğu çıkararak pencereyi ikiye böl
function splitWindow(w: TimeWindow, usedStart: number, usedEnd: number): TimeWindow[] {
  const result: TimeWindow[] = [];
  if (w.start < usedStart) result.push({ start: w.start, end: usedStart });
  if (usedEnd < w.end)     result.push({ start: usedEnd,  end: w.end   });
  return result;
}

// Ders sınıfını difficulty ve priority'ye göre belirle
function classifyLesson(difficulty: number, priority: string): LessonClass {
  if (difficulty >= 4 || priority === 'KRITIK') return 'AGIR';
  if (difficulty <= 2 && priority === 'DUSUK')  return 'HAFIF';
  return 'ORTA';
}

// Gün sınıfını DayConfig'deki göstergelere göre belirle
function getDayClass(day: DayConfig): DayClass {
  if (day.isRahat)     return 'rahat';
  if (day.isCokYorucu) return 'yorucu';
  return 'normal';
}

// Ders sınıfına göre gün indekslerini tercih sırasına göre döndür.
// Her tercih grubu içinde kronolojik sıra korunur.
function getDayOrder(
  lessonClass: LessonClass,
  dayConfigs: DayConfig[],
): Array<{ idx: number; dayClass: DayClass }> {
  const result: Array<{ idx: number; dayClass: DayClass }> = [];
  for (const targetClass of DAY_PREFERENCE[lessonClass]) {
    for (let i = 0; i < dayConfigs.length; i++) {
      if (getDayClass(dayConfigs[i]) === targetClass) {
        result.push({ idx: i, dayClass: targetClass });
      }
    }
  }
  return result;
}

// Slotlu mod: verilen güne yerleştirince takvimde 3 üst üste gün oluşur mu?
function creates3Consecutive(newIdx: number, placedDays: Set<number>): boolean {
  let streak = 1;
  let i = newIdx - 1;
  while (placedDays.has(i)) { streak++; i--; }
  i = newIdx + 1;
  while (placedDays.has(i)) { streak++; i++; }
  return streak >= 3;
}

// Tercih edilen saate göre bir slotun pencere uzaklığını hesapla
function windowDistance(
  startMin: number,
  preferredRange: { start: number; end: number },
): number {
  const windows = [
    { start: 8 * 60,  end: 11 * 60 },
    { start: 12 * 60, end: 15 * 60 },
    { start: 18 * 60, end: 21 * 60 },
    { start: 21 * 60, end: 24 * 60 },
  ];
  const preferredIdx = windows.findIndex(
    (w) => w.start === preferredRange.start && w.end === preferredRange.end,
  );
  if (preferredIdx === -1) return 0;

  const slotIdx = windows.findIndex((w) => startMin >= w.start && startMin < w.end);
  const effectiveIdx =
    slotIdx !== -1
      ? slotIdx
      : (() => {
          let closest = 0;
          let minDist = Infinity;
          windows.forEach((w, i) => {
            const d = Math.min(Math.abs(startMin - w.start), Math.abs(startMin - w.end));
            if (d < minDist) { minDist = d; closest = i; }
          });
          return closest;
        })();

  return Math.abs(effectiveIdx - preferredIdx);
}

// Bir candidate slota puan ver
function scoreCandidate(
  startMin: number,
  endMin: number,
  lessonClass: LessonClass,
  preferredRange: { start: number; end: number },
  dayClass: DayClass,
): number {
  let score = 0;

  const overlapStart = Math.max(startMin, preferredRange.start);
  const overlapEnd   = Math.min(endMin,   preferredRange.end);
  const overlapMin   = Math.max(0, overlapEnd - overlapStart);
  const duration     = endMin - startMin;
  const overlapRatio = overlapMin / duration;

  if      (overlapRatio >= 1.0) score += 30;
  else if (overlapRatio >= 0.5) score += 15;
  else if (overlapRatio >  0)   score += 5;

  if (lessonClass === 'AGIR' && overlapRatio >= 1.0) score += 20;
  if (lessonClass === 'AGIR' && overlapRatio === 0)  score -= 15;

  if (overlapRatio === 0) {
    const dist = windowDistance(startMin, preferredRange);
    if      (dist === 1) score -= 5;
    else if (dist === 2) score -= 15;
    else if (dist >= 3)  score -= 25;
  }

  if (lessonClass === 'HAFIF' && overlapRatio === 0) score += 5;
  if (lessonClass === 'AGIR'  && dayClass === 'rahat')  score += 15;
  if (lessonClass === 'AGIR'  && dayClass === 'yorucu') score -= 20;

  return score;
}

// Tüm candidate slotları üret (her free window içinde 30 dk adımlarla kaydırarak)
function generateCandidates(
  windows: TimeWindow[],
  neededMin: number,
): Array<{ windowIdx: number; startMin: number; endMin: number }> {
  const candidates: Array<{ windowIdx: number; startMin: number; endMin: number }> = [];
  for (let wi = 0; wi < windows.length; wi++) {
    const w = windows[wi];
    for (let s = w.start; s + neededMin <= w.end; s += 30) {
      candidates.push({ windowIdx: wi, startMin: s, endMin: s + neededMin });
    }
  }
  return candidates;
}

// En yüksek puanlı candidate slota yerleştir, başarılıysa true döner
function placeIntoWindows(
  windows: TimeWindow[],
  neededMin: number,
  preferredRange: { start: number; end: number },
  lessonId: number,
  day: DayConfig,
  blockCount: number,
  placed: PlacedBlock[],
  lessonClass: LessonClass,
  dayClass: DayClass,
  wave: 1 | 2 | 3 | 4,
): boolean {
  const candidates = generateCandidates(windows, neededMin);
  if (candidates.length === 0) return false;

  const scored = candidates.map((c) => ({
    ...c,
    score: scoreCandidate(c.startMin, c.endMin, lessonClass, preferredRange, dayClass),
  }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  placed.push({
    lessonId,
    date: day.date,
    startMin: best.startMin,
    endMin: best.endMin,
    blockCount,
    isReview: false,
    waveUsed: wave,
  });
  windows.splice(
    best.windowIdx,
    1,
    ...splitWindow(windows[best.windowIdx], best.startMin, best.endMin),
  );
  return true;
}

// ── PUAN SİSTEMİ ─────────────────────────────────────────────────────────────
const WAVE_PENALTY: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 1, 3: 2, 4: 4 };

function calcProgramLevel(
  violationScore: number,
  totalBlocks: number,
): ProgramLevel {
  if (totalBlocks === 0) return 'normal';
  const ratio = violationScore / (totalBlocks * 4);
  if (ratio < 0.15)  return 'normal';
  if (ratio < 0.45)  return 'busy';
  return 'very_busy';
}

// ── ANA FONKSİYON ────────────────────────────────────────────────────────────

interface LessonInput {
  lessonId: number;
  slottedMode: boolean;
  difficulty: number;
  priority: string;
}

interface PlacementResult {
  placed: PlacedBlock[];
  programScore: number;   // 0.0–1.0
  programLevel: ProgramLevel;
  forcedBlocks: number;   // dalga 3-4'ten geçen blok sayısı
}

// Bir dalga için round-robin: sığanları yerleştirir, sığmayanları döndürür.
// allowConsecutive : AGIR art arda kısıtı görmezden gel
// allowSessionOverflow: maxSessions sınırını aş
function runWave(
  wave: 1 | 2 | 3 | 4,
  lessonOrder: LessonInput[],
  remaining: Record<number, number>,
  dayConfigs: DayConfig[],
  freeWindows: Record<string, TimeWindow[]>,
  preferredRange: { start: number; end: number },
  dayBlocksRemaining: number[],
  sessionsUsed: number[],
  placedDaysPerLesson: Record<number, Set<number>>,
  placed: PlacedBlock[],
  allowConsecutive: boolean,
  allowSessionOverflow: boolean,
): void {
  const lessonMeta = new Map(
    lessonOrder.map((l) => [
      l.lessonId,
      {
        slottedMode: l.slottedMode,
        lessonClass: classifyLesson(l.difficulty, l.priority),
      },
    ]),
  );

  let progress = true;
  while (progress) {
    progress = false;

    for (const { lessonId } of lessonOrder) {
      if (remaining[lessonId] <= 0) continue;

      const { slottedMode, lessonClass } = lessonMeta.get(lessonId)!;
      const placedDays = placedDaysPerLesson[lessonId];

      // Gün tercihi sırasına göre — dalga 1-2'de orijinal, 3-4'de kronolojik
      const dayOrder =
        wave <= 2
          ? getDayOrder(lessonClass, dayConfigs)
          : dayConfigs.map((_, idx) => ({
              idx,
              dayClass: getDayClass(dayConfigs[idx]),
            }));

      for (const { idx: dayIdx, dayClass } of dayOrder) {
        if (remaining[lessonId] <= 0) break;
        if (dayBlocksRemaining[dayIdx] <= 0) continue;
        if (placedDays.has(dayIdx)) continue;

        const effectiveMaxSessions = allowSessionOverflow
          ? dayConfigs[dayIdx].maxSessions * 2
          : dayConfigs[dayIdx].maxSessions;

        if (sessionsUsed[dayIdx] >= effectiveMaxSessions) continue;

        if (!allowConsecutive) {
          // Slotlu mod: 3 üst üste gün kontrolü
          if (slottedMode && creates3Consecutive(dayIdx, placedDays)) continue;
          // AGIR ders art arda gün yasağı
          if (
            lessonClass === 'AGIR' &&
            (placedDays.has(dayIdx - 1) || placedDays.has(dayIdx + 1))
          ) continue;
        }

        const day = dayConfigs[dayIdx];
        const d = day.date;
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const windows = freeWindows[dateStr] || [];

        const toPlace = Math.min(
          remaining[lessonId],
          dayBlocksRemaining[dayIdx],
          day.maxBlocksPerSession,
        );
        if (toPlace <= 0) continue;

        const placedOk = placeIntoWindows(
          windows,
          toPlace * 30,
          preferredRange,
          lessonId,
          day,
          toPlace,
          placed,
          lessonClass,
          dayClass,
          wave,
        );

        freeWindows[dateStr] = windows.filter((w) => w.end > w.start);

        if (placedOk) {
          dayBlocksRemaining[dayIdx] -= toPlace;
          remaining[lessonId]        -= toPlace;
          sessionsUsed[dayIdx]++;
          placedDays.add(dayIdx);
          progress = true;
          break;
        }
      }
    }
  }
}

export function step8Placement(
  lessonOrder: LessonInput[],
  lessonAllocations: Record<number, number>,
  dayConfigs: DayConfig[],
  freeWindows: Record<string, TimeWindow[]>,
  preferredStudyTime: string,
): PlacementResult {
  const placed: PlacedBlock[] = [];
  const preferredRange    = getPreferredRange(preferredStudyTime);
  const dayBlocksRemaining = dayConfigs.map((d) => d.maxBlocks);
  const sessionsUsed       = dayConfigs.map(() => 0);

  const remaining: Record<number, number> = {};
  const placedDaysPerLesson: Record<number, Set<number>> = {};
  for (const { lessonId } of lessonOrder) {
    remaining[lessonId]        = lessonAllocations[lessonId] ?? 0;
    placedDaysPerLesson[lessonId] = new Set();
  }

  const totalBlocks = Object.values(remaining).reduce((a, b) => a + b, 0);

  const sharedArgs = [
    lessonOrder,
    remaining,
    dayConfigs,
    freeWindows,
    preferredRange,
    dayBlocksRemaining,
    sessionsUsed,
    placedDaysPerLesson,
    placed,
  ] as const;

  // Dalga 1: tüm kısıtlar aktif
  runWave(1, ...sharedArgs, false, false);

  // Dalga 2: AGIR art arda + slotlu mod kısıtı kaldırıldı
  runWave(2, ...sharedArgs, true, false);

  // Dalga 3: art arda kısıt yok + maxSessions overflow
  runWave(3, ...sharedArgs, true, true);

  // Dalga 4: her şeyi zorla (dayBlocks bütçesi görmezden, her güne koy)
  for (const { lessonId } of lessonOrder) {
    if (remaining[lessonId] <= 0) continue;

    for (let dayIdx = 0; dayIdx < dayConfigs.length; dayIdx++) {
      if (remaining[lessonId] <= 0) break;

      const day     = dayConfigs[dayIdx];
      const d       = day.date;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const windows = freeWindows[dateStr] || [];
      const lessonClass = classifyLesson(
        lessonOrder.find((l) => l.lessonId === lessonId)!.difficulty,
        lessonOrder.find((l) => l.lessonId === lessonId)!.priority,
      );
      const dayClass = getDayClass(day);

      const toPlace = Math.min(remaining[lessonId], day.maxBlocksPerSession);
      if (toPlace <= 0) continue;

      const placedOk = placeIntoWindows(
        windows,
        toPlace * 30,
        preferredRange,
        lessonId,
        day,
        toPlace,
        placed,
        lessonClass,
        dayClass,
        4,
      );

      freeWindows[dateStr] = windows.filter((w) => w.end > w.start);

      if (placedOk) {
        dayBlocksRemaining[dayIdx] -= toPlace;
        remaining[lessonId]        -= toPlace;
        sessionsUsed[dayIdx]++;
        placedDaysPerLesson[lessonId].add(dayIdx);
      }
    }
  }

  // Puan hesabı
  let violationScore = 0;
  let forcedBlocks   = 0;
  for (const block of placed) {
    const wave = block.waveUsed ?? 1;
    violationScore += WAVE_PENALTY[wave];
    if (wave >= 3) forcedBlocks += block.blockCount;
  }

  const programLevel = calcProgramLevel(violationScore, totalBlocks);
  const programScore =
    totalBlocks > 0 ? violationScore / (totalBlocks * 4) : 0;

  console.log(
    `[STEP8] totalBlocks=${totalBlocks} violationScore=${violationScore} programScore=${programScore.toFixed(3)} level=${programLevel} forcedBlocks=${forcedBlocks}`,
  );

  return { placed, programScore, programLevel, forcedBlocks };
}
