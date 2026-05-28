// Dersleri gün sınıfıyla eşleştirerek boş zaman pencerelerine yerleştir (ADIM 8)

import { DayConfig } from './step5-day-distribution';
import { ConstraintConfig, DEFAULT_CONSTRAINT_CONFIG } from './constraint-config';

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
  waveUsed?: 1 | 2 | 3 | 4 | 5; // hangi dalganın yerleştirdiği (review blokları için opsiyonel)
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
  wave: 1 | 2 | 3 | 4 | 5,
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

// ── KALİTE DEĞERLENDİRMESİ ───────────────────────────────────────────────────

export type QualityLevel = 'good' | 'acceptable' | 'poor';

export interface ScheduleQuality {
  qualityScore: number;      // 0.0–1.0 genel kalite
  qualityLevel: QualityLevel;
  fitRate: number;           // yerleşen / istenen blok oranı
  timingRate: number;        // tercih saatine giren blok oranı
  dayMatchRate: number;      // ders sınıfı → gün tipi uyum oranı
  densityScore: number;      // gün yoğunluğu dengesi
}

// Gün tipi uyum skoru: ders sınıfı × gün sınıfı kombinasyonu
function dayMatchScore(lessonClass: LessonClass, dayClass: DayClass): number {
  if (lessonClass === 'AGIR') {
    if (dayClass === 'rahat')  return 1.0;
    if (dayClass === 'normal') return 0.5;
    return 0.0; // yorucu
  }
  if (lessonClass === 'ORTA') {
    if (dayClass === 'normal') return 1.0;
    if (dayClass === 'rahat')  return 0.7;
    return 0.3; // yorucu
  }
  // HAFIF
  if (dayClass === 'yorucu') return 1.0;
  if (dayClass === 'normal') return 0.7;
  return 0.4; // rahat
}

function evaluateScheduleQuality(
  placed: PlacedBlock[],
  lessonAllocations: Record<number, number>,
  lessonOrder: LessonInput[],
  dayConfigs: DayConfig[],
  sessionsUsed: number[],
  preferredRange: { start: number; end: number },
  preferredRangeByDate: Record<string, { start: number; end: number }> = {},
): ScheduleQuality {
  const lessonClassMap = new Map(
    lessonOrder.map((l) => [l.lessonId, classifyLesson(l.difficulty, l.priority)]),
  );
  const dayDateMap = new Map(
    dayConfigs.map((d, idx) => {
      const dt = d.date;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      return [key, idx];
    }),
  );

  // 1. fitRate
  const totalRequested = Object.values(lessonAllocations).reduce((a, b) => a + b, 0);
  const totalPlaced    = placed.reduce((a, b) => a + b.blockCount, 0);
  const fitRate        = totalRequested === 0 ? 1 : totalPlaced / totalRequested;

  if (totalPlaced === 0) {
    return { qualityScore: fitRate, qualityLevel: fitRate >= 0.8 ? 'good' : 'poor', fitRate, timingRate: 0, dayMatchRate: 0, densityScore: 0 };
  }

  // 2. timingRate — tercih saatiyle örtüşme ortalaması
  let timingSum = 0;
  let dayMatchSum = 0;

  for (const block of placed) {
    // Bloğun gününe ait preferred range varsa onu kullan, yoksa global
    const blockDateStr = `${block.date.getFullYear()}-${String(block.date.getMonth() + 1).padStart(2, '0')}-${String(block.date.getDate()).padStart(2, '0')}`;
    const blockRange = preferredRangeByDate[blockDateStr] ?? preferredRange;
    const overlapStart  = Math.max(block.startMin, blockRange.start);
    const overlapEnd    = Math.min(block.endMin,   blockRange.end);
    const overlapMin    = Math.max(0, overlapEnd - overlapStart);
    const duration      = block.endMin - block.startMin;
    const overlapRatio  = duration > 0 ? overlapMin / duration : 0;

    timingSum += overlapRatio * block.blockCount;

    // 3. dayMatchRate — ders sınıfı × gün tipi uyumu
    const d = block.date;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayIdx  = dayDateMap.get(dateStr);
    const lessonClass = lessonClassMap.get(block.lessonId) ?? 'ORTA';
    const dc = dayIdx !== undefined ? getDayClass(dayConfigs[dayIdx]) : 'normal';
    dayMatchSum += dayMatchScore(lessonClass, dc) * block.blockCount;
  }

  const timingRate   = timingSum   / totalPlaced;
  const dayMatchRate = dayMatchSum / totalPlaced;

  // 4. densityScore — aktif günlerin yoğunluk dengesi
  const activeDayScores: number[] = [];
  for (let i = 0; i < dayConfigs.length; i++) {
    if (sessionsUsed[i] === 0) continue;
    const ratio = sessionsUsed[i] / dayConfigs[i].maxSessions;
    activeDayScores.push(ratio <= 1 ? 1.0 : 1.0 / ratio);
  }
  const densityScore =
    activeDayScores.length === 0
      ? 1.0
      : activeDayScores.reduce((a, b) => a + b, 0) / activeDayScores.length;

  // 5. Birleşik skor
  const qualityScore =
    fitRate    * 0.40 +
    timingRate * 0.25 +
    dayMatchRate * 0.25 +
    densityScore * 0.10;

  const qualityLevel: QualityLevel =
    qualityScore >= 0.80 ? 'good' :
    qualityScore >= 0.50 ? 'acceptable' :
    'poor';

  return { qualityScore, qualityLevel, fitRate, timingRate, dayMatchRate, densityScore };
}

// ── PUAN SİSTEMİ ─────────────────────────────────────────────────────────────
const WAVE_PENALTY: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5 };

function calcProgramLevel(
  violationScore: number,
  totalBlocks: number,
): ProgramLevel {
  if (totalBlocks === 0) return 'normal';
  const ratio = violationScore / (totalBlocks * 5);
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
  programScore: number;          // 0.0–1.0 (dalga bazlı zorluk skoru)
  programLevel: ProgramLevel;
  forcedBlocks: number;          // dalga 3-4'ten geçen blok sayısı
  unplacedLessonIds: number[];   // hiç yerleştirilemeyen dersler
  quality: ScheduleQuality;      // yerleşim kalitesi (fitRate, timingRate, dayMatch, density)
}

// Bir dalga için round-robin: sığanları yerleştirir, sığmayanları döndürür.
// allowConsecutive  : AGIR art arda kısıtı görmezden gel
// allowSessionOverflow: maxSessions sınırını aş
// stepDownToPlace   : pencereye sığmıyorsa toPlace'i 1'e kadar azaltarak dene
// constraintConfig  : kullanıcı tercihleri (allowConsecutiveAgir, slottedModeDisabled)
// preferredRangeByDate: gün bazlı tercih saati override haritası
function runWave(
  wave: 1 | 2 | 3 | 4 | 5,
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
  stepDownToPlace: boolean,
  constraintConfig: ConstraintConfig,
  preferredRangeByDate: Record<string, { start: number; end: number }>,
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
          // Slotlu mod: 3 üst üste gün kontrolü — kullanıcı override ettiyse atla
          if (
            !constraintConfig.slottedModeDisabled &&
            slottedMode &&
            creates3Consecutive(dayIdx, placedDays)
          ) continue;
          // AGIR ders art arda gün yasağı — kullanıcı override ettiyse atla
          if (
            !constraintConfig.allowConsecutiveAgir &&
            lessonClass === 'AGIR' &&
            (placedDays.has(dayIdx - 1) || placedDays.has(dayIdx + 1))
          ) continue;
        }

        const day = dayConfigs[dayIdx];
        const d = day.date;
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const windows = freeWindows[dateStr] || [];
        const dayRange = preferredRangeByDate[dateStr] ?? preferredRange;

        const maxToPlace = Math.min(
          remaining[lessonId],
          dayBlocksRemaining[dayIdx],
          day.maxBlocksPerSession,
        );
        if (maxToPlace <= 0) continue;

        let placedOk = false;
        let actualToPlace = maxToPlace;

        if (stepDownToPlace) {
          for (let tp = maxToPlace; tp >= 1; tp--) {
            if (placeIntoWindows(windows, tp * 30, dayRange, lessonId, day, tp, placed, lessonClass, dayClass, wave)) {
              placedOk = true;
              actualToPlace = tp;
              break;
            }
          }
        } else {
          placedOk = placeIntoWindows(windows, maxToPlace * 30, dayRange, lessonId, day, maxToPlace, placed, lessonClass, dayClass, wave);
        }

        freeWindows[dateStr] = windows.filter((w) => w.end > w.start);

        if (placedOk) {
          dayBlocksRemaining[dayIdx] -= actualToPlace;
          remaining[lessonId]        -= actualToPlace;
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
  constraintConfig: ConstraintConfig = DEFAULT_CONSTRAINT_CONFIG,
): PlacementResult {
  const placed: PlacedBlock[] = [];
  const preferredRange    = getPreferredRange(preferredStudyTime);
  const dayBlocksRemaining = dayConfigs.map((d) => d.maxBlocks);
  const sessionsUsed       = dayConfigs.map(() => 0);

  // Gün bazlı tercih saati haritası — config'de override yoksa global range kullanılır
  const preferredRangeByDate: Record<string, { start: number; end: number }> = {};
  for (const day of dayConfigs) {
    const d = day.date;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const override = constraintConfig.dayStudyTimeOverrides[day.dayOfWeek];
    preferredRangeByDate[dateStr] = override
      ? getPreferredRange(override)
      : preferredRange;
  }

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

  // Dalga 1: tüm kısıtlar aktif (config'le açılabilir olanlar dahil)
  runWave(1, ...sharedArgs, false, false, false, constraintConfig, preferredRangeByDate);

  // Dalga 2: AGIR art arda + slotlu mod kısıtı kaldırıldı
  runWave(2, ...sharedArgs, true, false, false, constraintConfig, preferredRangeByDate);

  // Dalga 3: küçük pencere — toPlace maxBPS'den 1'e kadar azaltarak dene
  runWave(3, ...sharedArgs, true, false, true, constraintConfig, preferredRangeByDate);

  // Dalga 4: art arda kısıt yok + maxSessions overflow
  runWave(4, ...sharedArgs, true, true, false, constraintConfig, preferredRangeByDate);

  // Dalga 5: her şeyi zorla (dayBlocks bütçesi görmezden) — round-robin + step-down
  const wave5Meta = new Map(
    lessonOrder.map((l) => [l.lessonId, classifyLesson(l.difficulty, l.priority)]),
  );
  let wave5Progress = true;
  while (wave5Progress) {
    wave5Progress = false;

    for (const { lessonId } of lessonOrder) {
      if (remaining[lessonId] <= 0) continue;

      const lessonClass = wave5Meta.get(lessonId)!;

      for (let dayIdx = 0; dayIdx < dayConfigs.length; dayIdx++) {
        const day      = dayConfigs[dayIdx];
        const d        = day.date;
        const dateStr  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const windows  = freeWindows[dateStr] || [];
        const dayClass = getDayClass(day);
        const dayRange = preferredRangeByDate[dateStr] ?? preferredRange;

        const maxToPlace = Math.min(remaining[lessonId], day.maxBlocksPerSession);
        if (maxToPlace <= 0) continue;

        let placedOk = false;
        let actualToPlace = maxToPlace;
        for (let tp = maxToPlace; tp >= 1; tp--) {
          if (placeIntoWindows(windows, tp * 30, dayRange, lessonId, day, tp, placed, lessonClass, dayClass, 5)) {
            placedOk = true;
            actualToPlace = tp;
            break;
          }
        }

        freeWindows[dateStr] = windows.filter((w) => w.end > w.start);

        if (placedOk) {
          dayBlocksRemaining[dayIdx] -= actualToPlace;
          remaining[lessonId]        -= actualToPlace;
          sessionsUsed[dayIdx]++;
          placedDaysPerLesson[lessonId].add(dayIdx);
          wave5Progress = true;
          break;
        }
      }
    }
  }

  // Puan hesabı
  let violationScore = 0;
  let forcedBlocks   = 0;
  for (const block of placed) {
    const wave = block.waveUsed ?? 1;
    violationScore += WAVE_PENALTY[wave];
    if (wave >= 4) forcedBlocks += block.blockCount;
  }

  const unplacedLessonIds = Object.entries(remaining)
    .filter(([, r]) => r > 0)
    .map(([id]) => Number(id));

  const programLevel = calcProgramLevel(violationScore, totalBlocks);
  const programScore =
    totalBlocks > 0 ? violationScore / (totalBlocks * 5) : 0;

  const quality = evaluateScheduleQuality(
    placed,
    lessonAllocations,
    lessonOrder,
    dayConfigs,
    sessionsUsed,
    preferredRange,
    preferredRangeByDate,
  );

  console.log(
    `[STEP8] totalBlocks=${totalBlocks} violationScore=${violationScore} programScore=${programScore.toFixed(3)} level=${programLevel} forcedBlocks=${forcedBlocks} unplaced=${unplacedLessonIds.length} (5-wave system)`,
  );
  console.log(
    `[STEP8] quality: score=${quality.qualityScore.toFixed(3)} level=${quality.qualityLevel} fit=${quality.fitRate.toFixed(2)} timing=${quality.timingRate.toFixed(2)} dayMatch=${quality.dayMatchRate.toFixed(2)} density=${quality.densityScore.toFixed(2)}`,
  );

  return { placed, programScore, programLevel, forcedBlocks, unplacedLessonIds, quality };
}
