"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step8Placement = step8Placement;
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
function step8Placement(lessonOrder, lessonAllocations, dayConfigs, freeWindows, preferredStudyTime) {
    const placed = [];
    const notFitted = {};
    const dayBlocksRemaining = dayConfigs.map((d) => d.maxBlocks);
    const preferredRange = getPreferredRange(preferredStudyTime);
    for (const { lessonId, slottedMode } of lessonOrder) {
        let remaining = lessonAllocations[lessonId] ?? 0;
        let lastPlacedDayIndex = -99;
        let consecutiveCount = 0;
        for (let dayIdx = 0; dayIdx < dayConfigs.length && remaining > 0; dayIdx++) {
            if (dayBlocksRemaining[dayIdx] <= 0)
                continue;
            if (slottedMode) {
                if (dayIdx === lastPlacedDayIndex + 1) {
                    consecutiveCount++;
                    if (consecutiveCount >= 3)
                        continue;
                }
                else {
                    consecutiveCount = 1;
                }
            }
            const day = dayConfigs[dayIdx];
            const dateStr = day.date.toISOString().substring(0, 10);
            const windows = freeWindows[dateStr] || [];
            const toPlace = Math.min(remaining, dayBlocksRemaining[dayIdx], day.maxBlocksPerSession);
            if (toPlace <= 0)
                continue;
            const neededMin = toPlace * 30;
            let placedOk = false;
            for (let i = 0; i < windows.length; i++) {
                const w = windows[i];
                const effStart = Math.max(w.start, preferredRange.start);
                const effEnd = Math.min(w.end, preferredRange.end);
                if (effEnd - effStart >= neededMin) {
                    placed.push({
                        lessonId,
                        date: day.date,
                        startMin: effStart,
                        endMin: effStart + neededMin,
                        blockCount: toPlace,
                        isReview: false,
                    });
                    windows.splice(i, 1, ...splitWindow(w, effStart, effStart + neededMin));
                    placedOk = true;
                    break;
                }
            }
            if (!placedOk) {
                for (let i = 0; i < windows.length; i++) {
                    const w = windows[i];
                    if (w.end - w.start >= neededMin) {
                        placed.push({
                            lessonId,
                            date: day.date,
                            startMin: w.start,
                            endMin: w.start + neededMin,
                            blockCount: toPlace,
                            isReview: false,
                        });
                        windows.splice(i, 1, ...splitWindow(w, w.start, w.start + neededMin));
                        placedOk = true;
                        break;
                    }
                }
            }
            freeWindows[dateStr] = windows.filter((w) => w.end > w.start);
            if (placedOk) {
                dayBlocksRemaining[dayIdx] -= toPlace;
                remaining -= toPlace;
                lastPlacedDayIndex = dayIdx;
            }
        }
        if (remaining > 0) {
            notFitted[lessonId] = remaining;
        }
    }
    return { placed, notFitted };
}
//# sourceMappingURL=step8-placement.js.map