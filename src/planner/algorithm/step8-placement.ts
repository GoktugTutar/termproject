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

// Ders sınıfına göre günlük maksimum blok sayısı
// AGIR: max 1 blok/oturum (zor derslerde yoğunlaşma önlenir)
// ORTA: max 2 blok/oturum
// HAFIF: sınır yok (day.maxBlocksPerSession'a bırakılır)
const LESSON_CLASS_CAP: Record<LessonClass, number> = {
  AGIR:  1,
  ORTA:  2,
  HAFIF: 99,
};

// Bir oturuma yerleştirilecek blok sayısını hesapla (gün + ders sınıfı kısıtları)
function calcToPlace(
  remaining: number,
  dayRemaining: number,
  dayMaxPerSession: number,
  lessonClass: LessonClass,
): number {
  return Math.min(remaining, dayRemaining, dayMaxPerSession, LESSON_CLASS_CAP[lessonClass]);
}

// Bir candidate slota puan ver
// Yüksek puan = bu ders bu saate daha uygun
function scoreCandidate(
  startMin: number,
  endMin: number,
  lessonClass: LessonClass,
  difficulty: number,
  preferredRange: { start: number; end: number },
  dayClass: DayClass,
  sessionsInPreferred: number,
): number {
  let score = 0;

  // Tercih edilen saat dilimiyle örtüşme
  const overlapStart = Math.max(startMin, preferredRange.start);
  const overlapEnd = Math.min(endMin, preferredRange.end);
  const overlapMin = Math.max(0, overlapEnd - overlapStart);
  const duration = endMin - startMin;
  const overlapRatio = overlapMin / duration;

  if (overlapRatio >= 1.0) score += 30;       // tam örtüşme
  else if (overlapRatio >= 0.5) score += 15;  // kısmi örtüşme
  else if (overlapRatio > 0) score += 5;      // az örtüşme

  // AGIR ders tercih edilen saatteyse ekstra bonus
  if (lessonClass === 'AGIR' && overlapRatio >= 1.0) score += 20;

  // AGIR ders tercih edilen saat dışındaysa ceza
  if (lessonClass === 'AGIR' && overlapRatio === 0) score -= 15;

  // HAFIF ders tercih edilen saat dışındaysa hafif bonus
  // (kolay dersler, yoğun saatleri zor dersler için boşaltır)
  if (lessonClass === 'HAFIF' && overlapRatio === 0) score += 10;

  // AGIR ders gece saatinde (21:00+) ceza
  if (lessonClass === 'AGIR' && startMin >= 21 * 60) score -= 35;

  // AGIR ders sabah erken (08:00-12:00) bonus — peak hours
  if (lessonClass === 'AGIR' && startMin < 12 * 60 && startMin >= 8 * 60) score += 10;

  // HAFIF ders gece saatinde küçük bonus (boş saatleri doldurur)
  if (lessonClass === 'HAFIF' && startMin >= 21 * 60) score += 10;

  // Rahat günde zor ders → ekstra bonus
  if (lessonClass === 'AGIR' && dayClass === 'rahat') score += 15;

  // Yorucu günde zor ders → ceza
  if (lessonClass === 'AGIR' && dayClass === 'yorucu') score -= 20;

  // Tercih edilen saatte zaten çok oturum var → yeni ders başka saate yönlendirilsin
  const overlapStart2 = Math.max(startMin, preferredRange.start);
  const overlapEnd2 = Math.min(endMin, preferredRange.end);
  const isInPreferred = overlapStart2 < overlapEnd2;
  if (isInPreferred && sessionsInPreferred >= 2) score -= 20; // 3+ oturum → güçlü ceza
  else if (isInPreferred && sessionsInPreferred === 1) score -= 5; // 2. oturum → hafif ceza

  return score;
}

// Tüm candidate slotları üret (her free window içinde kaydırarak)
function generateCandidates(
  windows: TimeWindow[],
  neededMin: number,
): Array<{ windowIdx: number; startMin: number; endMin: number }> {
  const candidates: Array<{ windowIdx: number; startMin: number; endMin: number }> = [];
  for (let wi = 0; wi < windows.length; wi++) {
    const w = windows[wi];
    // 30 dakika adımlarla kaydır
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
  difficulty: number,
  dayClass: DayClass,
  sessionsInPreferred: number,
): boolean {
  const candidates = generateCandidates(windows, neededMin);
  if (candidates.length === 0) return false;

  // Her candidate için puan hesapla
  const scored = candidates.map((c) => ({
    ...c,
    score: scoreCandidate(c.startMin, c.endMin, lessonClass, difficulty, preferredRange, dayClass, sessionsInPreferred),
  }));
  
  // En yüksek puanlı candidate'i seç
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  // Seçilen slotu yerleştir ve pencereyi güncelle
  placed.push({
    lessonId,
    date: day.date,
    startMin: best.startMin,
    endMin: best.endMin,
    blockCount,
    isReview: false,
  });
  windows.splice(best.windowIdx, 1, ...splitWindow(windows[best.windowIdx], best.startMin, best.endMin));
  return true;
}

// Bir slotun tercih edilen saatte olup olmadığını kontrol et
function isSlotInPreferred(startMin: number, endMin: number, preferredRange: { start: number; end: number }): boolean {
  return Math.max(startMin, preferredRange.start) < Math.min(endMin, preferredRange.end);
}

// Tüm dersleri round-robin + gün/ders sınıfı eşleşmesi + kapasite kısıtlarıyla yerleştir
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

  // Her ders için kalan blok sayısı ve yerleştirildiği gün indeksleri
  const remaining: Record<number, number> = {};
  const placedDaysPerLesson: Record<number, Set<number>> = {};
  // Her gün için tercih edilen saatte kaç oturum yerleştirildi
  const daySessionsInPreferred: Record<number, number> = {};
  for (let i = 0; i < dayConfigs.length; i++) daySessionsInPreferred[i] = 0;
  for (const { lessonId } of lessonOrder) {
    remaining[lessonId] = lessonAllocations[lessonId] ?? 0;
    placedDaysPerLesson[lessonId] = new Set();
  }

  // Ders meta bilgilerini hızlı erişim için map'e al
  const lessonMeta = new Map(
    lessonOrder.map((l) => [l.lessonId, {
      slottedMode: l.slottedMode,
      lessonClass: classifyLesson(l.difficulty, l.priority),
      preferredIntensity: getDayIntensity(DAY_PREFERENCE[classifyLesson(l.difficulty, l.priority)][0]),
    }])
  );

  // Round-robin: her turda her ders için en uygun güne 1 oturum yerleştir.
  // Tüm dersler dolana veya hiçbir ilerleme olmayana kadar döngü sürer.
  let progress = true;
  while (progress) {
    progress = false;

    for (const { lessonId } of lessonOrder) {
      if (remaining[lessonId] <= 0) continue;

      const meta = lessonMeta.get(lessonId)!;
      const { slottedMode, lessonClass, preferredIntensity } = meta;
      const placedDays = placedDaysPerLesson[lessonId];
      const dayOrder = getDayOrder(lessonClass, dayConfigs);

      for (const { idx: dayIdx, dayClass } of dayOrder) {
        if (remaining[lessonId] <= 0) break;
        if (dayBlocksRemaining[dayIdx] <= 0) continue;

        // AGIR dersler: bir güne zaten yerleştirildiyse o gün atlanır
        // (günlük max 1 oturum — LESSON_CLASS_CAP zaten bunu sınırlar ama
        //  round-robin'de aynı derse aynı günde ikinci tur gelmemeli)
        if (placedDays.has(dayIdx)) continue;

        // Slotlu mod: 3 üst üste gün oluşturma
        if (slottedMode && creates3Consecutive(dayIdx, placedDays)) continue;

        // AGIR dersler arka arkaya gün almasın (slottedMode olmasa bile)
        if (lessonClass === 'AGIR' && (placedDays.has(dayIdx - 1) || placedDays.has(dayIdx + 1))) continue;

        const day = dayConfigs[dayIdx];
        const d = day.date; const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const windows = freeWindows[dateStr] || [];

        const toPlace = calcToPlace(
          remaining[lessonId],
          dayBlocksRemaining[dayIdx],
          day.maxBlocksPerSession,
          lessonClass,
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
          lessonOrder.find(l => l.lessonId === lessonId)!.difficulty,
          dayClass,
          daySessionsInPreferred[dayIdx],
        );

        freeWindows[dateStr] = windows.filter((w) => w.end > w.start);

        if (placedOk) {
          if (getDayIntensity(dayClass) > preferredIntensity) programZorlastu = true;
          dayBlocksRemaining[dayIdx] -= toPlace;
          remaining[lessonId] -= toPlace;
          placedDays.add(dayIdx);
          progress = true;
          // Tercih edilen saatte yerleştirildi mi? Sayacı güncelle
          const lastPlaced = placed[placed.length - 1];
          if (isSlotInPreferred(lastPlaced.startMin, lastPlaced.endMin, preferredRange)) {
            daySessionsInPreferred[dayIdx]++;
          }
          break;
        }
      }
    }
  }

  // Yerleştirilemeyen blokları kaydet
  for (const { lessonId } of lessonOrder) {
    if (remaining[lessonId] > 0) {
      notFitted[lessonId] = remaining[lessonId];
    }
  }
  console.log('DAY REMAINING AFTER PLACEMENT:', dayConfigs.map((d, i) => ({
  date: d.date.toLocaleDateString(),
  remaining: dayBlocksRemaining[i]
})));
  return { placed, notFitted, programZorlastu };
}