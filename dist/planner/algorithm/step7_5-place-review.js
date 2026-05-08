"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step7_5PlaceReview = step7_5PlaceReview;
function step7_5PlaceReview(reviewBlocks, freeWindows, preferredStudyTime, lessonAllocations) {
    const placed = [];
    const updatedAllocations = { ...lessonAllocations };
    const updatedFreeWindows = JSON.parse(JSON.stringify(freeWindows));
    const preferredRange = getPreferredRange(preferredStudyTime);
    for (const rb of reviewBlocks) {
        const dateStr = rb.date.toISOString().substring(0, 10);
        const windows = updatedFreeWindows[dateStr] || [];
        const neededMin = rb.blocks * 30;
        let placedOk = false;
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
                windows.splice(i, 1, ...splitWindow(w, effectiveStart, effectiveStart + neededMin));
                placedOk = true;
                break;
            }
        }
        if (!placedOk) {
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
        if (placedOk) {
            const current = updatedAllocations[rb.lessonId] ?? 0;
            updatedAllocations[rb.lessonId] = Math.max(0, current - rb.blocks);
        }
    }
    return { placed, updatedAllocations, updatedFreeWindows };
}
function getPreferredRange(preferredStudyTime) {
    switch (preferredStudyTime) {
        case 'morning': return { start: 8 * 60, end: 11 * 60 };
        case 'afternoon': return { start: 12 * 60, end: 15 * 60 };
        case 'evening': return { start: 18 * 60, end: 21 * 60 };
        case 'night': return { start: 21 * 60, end: 24 * 60 };
        default: return { start: 8 * 60, end: 24 * 60 };
    }
}
function splitWindow(w, usedStart, usedEnd) {
    const result = [];
    if (w.start < usedStart)
        result.push({ start: w.start, end: usedStart });
    if (usedEnd < w.end)
        result.push({ start: usedEnd, end: w.end });
    return result;
}
//# sourceMappingURL=step7_5-place-review.js.map