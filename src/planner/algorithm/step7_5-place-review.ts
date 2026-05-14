// Tekrar bloklarını boş zaman pencerelerine yerleştir (ADIM 7.5)
import { ReviewBlock } from './step3-review-blocks';

export interface TimeWindow {
  start: number; // dakika (gün başından itibaren)
  end: number;
}

// Tekrar bloklarını tercih edilen saatlerde veya ilk uygun slotta yerleştir
export function step7_5PlaceReview(
  reviewBlocks: ReviewBlock[],
  freeWindows: Record<string, TimeWindow[]>, // dateStr -> boş zaman dilimleri
  preferredStudyTime: string,
  lessonAllocations: Record<number, number>,
): {
  placed: Array<{ lessonId: number; date: Date; startMin: number; endMin: number; isReview: boolean; blockCount: number }>;
  updatedAllocations: Record<number, number>;
  updatedFreeWindows: Record<string, TimeWindow[]>;
} {
  const placed: Array<{ lessonId: number; date: Date; startMin: number; endMin: number; isReview: boolean; blockCount: number }> = [];
  const updatedAllocations = { ...lessonAllocations };
  const updatedFreeWindows = JSON.parse(JSON.stringify(freeWindows)) as Record<string, TimeWindow[]>;

  // Tercih edilen saat dilimi aralığı
  const preferredRange = getPreferredRange(preferredStudyTime);

  for (const rb of reviewBlocks) {
    const d = rb.date; const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const windows = updatedFreeWindows[dateStr] || [];
    const neededMin = rb.blocks * 30;

    let placedOk = false;

    // Önce tercih edilen zaman dilimine yerleştirmeyi dene
    for (let i = 0; i < windows.length; i++) {
      const w = windows[i];
      const effectiveStart = Math.max(w.start, preferredRange.start);
      const effectiveEnd = Math.min(w.end, preferredRange.end);

      if (effectiveEnd - effectiveStart >= neededMin) {
        placed.push({
          lessonId: rb.lessonId,
          date: rb.date,
          startMin: effectiveStart,
          endMin: effectiveStart + neededMin,
          isReview: true,
          blockCount: rb.blocks,
        });
        // Kullanılan slotu free windows'dan çıkar
        windows.splice(i, 1, ...splitWindow(w, effectiveStart, effectiveStart + neededMin));
        placedOk = true;
        break;
      }
    }

    if (!placedOk) {
      // İlk uygun slota yerleştir
      for (let i = 0; i < windows.length; i++) {
        const w = windows[i];
        if (w.end - w.start >= neededMin) {
          placed.push({
            lessonId: rb.lessonId,
            date: rb.date,
            startMin: w.start,
            endMin: w.start + neededMin,
            isReview: true,
            blockCount: rb.blocks,
          });
          windows.splice(i, 1, ...splitWindow(w, w.start, w.start + neededMin));
          placedOk = true;
          break;
        }
      }
    }

    updatedFreeWindows[dateStr] = windows.filter((w) => w.end > w.start);

    // Review bloklar ekstra çalışmadır — haftalık tahsisten düşülmez
  }

  return { placed, updatedAllocations, updatedFreeWindows };
}

// Tercih edilen çalışma saatini dakika aralığına çevir
function getPreferredRange(preferredStudyTime: string): { start: number; end: number } {
  switch (preferredStudyTime) {
    case 'morning':    return { start: 8 * 60, end: 11 * 60 };
    case 'afternoon':  return { start: 12 * 60, end: 15 * 60 };
    case 'evening':    return { start: 18 * 60, end: 21 * 60 };
    case 'night':      return { start: 21 * 60, end: 24 * 60 };
    default:           return { start: 8 * 60, end: 24 * 60 };
  }
}

// Kullanılan bloğu çıkararak pencereyi ikiye böl
function splitWindow(w: { start: number; end: number }, usedStart: number, usedEnd: number) {
  const result: { start: number; end: number }[] = [];
  if (w.start < usedStart) result.push({ start: w.start, end: usedStart });
  if (usedEnd < w.end) result.push({ start: usedEnd, end: w.end });
  return result;
}