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
}

// Her ders sınıfı için tercih edilen gün sınıfı sırası
const DAY_PREFERENCE: Record<LessonClass, DayClass[]> = {
  AGIR:  ['rahat', 'normal', 'yorucu'],
  ORTA:  ['normal', 'rahat', 'yorucu'],
  HAFIF: ['yorucu', 'normal', 'rahat'],
};

// Tercih edilen çalışma saatini dakika aralığına çevir
function getPreferredRange(preferredStudyTime: string): { start: number; end: number } {
  switch (preferredStudyTime) {
    case 'morning':   return { start: 8 * 60, end: 11 * 60 };
    case 'afternoon': return { start: 12 * 60, end: 15 * 60 };
    case 'evening':   return { start: 18 * 60, end: 21 * 60 };
    case 'night':     return { start: 21 * 60, end: 24 * 60 };
    default:          return { start: 8 * 60, end: 24 * 60 };
  }
}

// Kullanılan bloğu çıkararak pencereyi ikiye böl
function splitWindow(w: TimeWindow, usedStart: number, usedEnd: number): TimeWindow[] {
  const result: TimeWindow[] = [];
  if (w.start < usedStart) result.push({ start: w.start, end: usedStart });
  if (usedEnd < w.end) result.push({ start: usedEnd, end: w.end });
  return result;
}

// Ders sınıfını difficulty ve priority'ye göre belirle
function classifyLesson(difficulty: number, priority: string): LessonClass {
  if (difficulty >= 4 || priority === 'KRITIK') return 'AGIR';
  if (difficulty <= 2 && priority === 'DUSUK') return 'HAFIF';
  return 'ORTA';
}

// Gün sınıfını DayConfig'deki göstergelere göre belirle
function getDayClass(day: DayConfig): DayClass {
  if (day.isRahat) return 'rahat';
  if (day.isCokYorucu) return 'yorucu';
  return 'normal';
}

// Gün sınıfının sayısal yoğunluk seviyesi
function getDayIntensity(cls: DayClass): number {
  if (cls === 'rahat') return 1;
  if (cls === 'normal') return 2;
  return 3; // yorucu
}

// Ders sınıfına göre gün indekslerini tercih sırasına göre döndür.
// Her tercih grubu içinde kronolojik sıra korunur.
function getDayOrder(lessonClass: LessonClass, dayConfigs: DayConfig[]): Array<{ idx: number; dayClass: DayClass }> {
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

// Tüm dersleri öncelik sırasına, gün/ders sınıfı eşleşmesine ve kapasite kısıtlarına göre yerleştir
export function step8Placement(
  lessonOrder: Array<{ lessonId: number; slottedMode: boolean; difficulty: number; priority: string }>,
  lessonAllocations: Record<number, number>,
  dayConfigs: DayConfig[],
  freeWindows: Record<string, TimeWindow[]>,
  preferredStudyTime: string,
): { placed: PlacedBlock[]; notFitted: Record<number, number>; programZorlastu: boolean } {
  const placed: PlacedBlock[] = [];
  const notFitted: Record<number, number> = {};
  const dayBlocksRemaining = dayConfigs.map((d) => d.maxBlocks);
  const preferredRange = getPreferredRange(preferredStudyTime);
  let programZorlastu = false;

  for (const { lessonId, slottedMode, difficulty, priority } of lessonOrder) {
    let remaining = lessonAllocations[lessonId] ?? 0;
    const placedDays = new Set<number>(); // slotlu mod için o derse ait yerleştirilen gün indeksleri

    const lessonClass = classifyLesson(difficulty, priority);
    const preferredIntensity = getDayIntensity(DAY_PREFERENCE[lessonClass][0]);
    const dayOrder = getDayOrder(lessonClass, dayConfigs);

    for (const { idx: dayIdx, dayClass } of dayOrder) {
      if (remaining <= 0) break;
      if (dayBlocksRemaining[dayIdx] <= 0) continue;

      // Slotlu mod: aynı ders 3 takvim günü üst üste yerleştirilemez
      if (slottedMode && creates3Consecutive(dayIdx, placedDays)) continue;

      const day = dayConfigs[dayIdx];
      const dateStr = day.date.toISOString().substring(0, 10);
      const windows = freeWindows[dateStr] || [];

      const toPlace = Math.min(remaining, dayBlocksRemaining[dayIdx], day.maxBlocksPerSession);
      if (toPlace <= 0) continue;

      const neededMin = toPlace * 30;
      let placedOk = false;

      // Önce tercih edilen saatte yerleştirmeyi dene
      for (let i = 0; i < windows.length; i++) {
        const w = windows[i];
        const effStart = Math.max(w.start, preferredRange.start);
        const effEnd = Math.min(w.end, preferredRange.end);
        if (effEnd - effStart >= neededMin) {
          placed.push({ lessonId, date: day.date, startMin: effStart, endMin: effStart + neededMin, blockCount: toPlace, isReview: false });
          windows.splice(i, 1, ...splitWindow(w, effStart, effStart + neededMin));
          placedOk = true;
          break;
        }
      }

      if (!placedOk) {
        // İlk uygun boş slota yerleştir
        for (let i = 0; i < windows.length; i++) {
          const w = windows[i];
          if (w.end - w.start >= neededMin) {
            placed.push({ lessonId, date: day.date, startMin: w.start, endMin: w.start + neededMin, blockCount: toPlace, isReview: false });
            windows.splice(i, 1, ...splitWindow(w, w.start, w.start + neededMin));
            placedOk = true;
            break;
          }
        }
      }

      freeWindows[dateStr] = windows.filter((w) => w.end > w.start);

      if (placedOk) {
        // Ders tercih ettiğinden daha yoğun bir güne yerleştirildi → program zorlaştı
        if (getDayIntensity(dayClass) > preferredIntensity) {
          programZorlastu = true;
        }
        dayBlocksRemaining[dayIdx] -= toPlace;
        remaining -= toPlace;
        placedDays.add(dayIdx);
      }
    }

    if (remaining > 0) {
      notFitted[lessonId] = remaining;
    }
  }

  return { placed, notFitted, programZorlastu };
}
