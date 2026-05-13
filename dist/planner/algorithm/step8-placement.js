"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step8Placement = step8Placement;
const DAY_PREFERENCE = {
    AGIR: ['rahat', 'normal', 'yorucu'],
    ORTA: ['normal', 'rahat', 'yorucu'],
    HAFIF: ['yorucu', 'normal', 'rahat'],
};
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
function classifyLesson(difficulty, priority) {
    if (difficulty >= 4 || priority === 'KRITIK')
        return 'AGIR';
    if (difficulty <= 2 && priority === 'DUSUK')
        return 'HAFIF';
    return 'ORTA';
}
function getDayClass(day) {
    if (day.isRahat)
        return 'rahat';
    if (day.isCokYorucu)
        return 'yorucu';
    return 'normal';
}
function getDayIntensity(cls) {
    if (cls === 'rahat')
        return 1;
    if (cls === 'normal')
        return 2;
    return 3;
}
function getDayOrder(lessonClass, dayConfigs) {
    const result = [];
    for (const targetClass of DAY_PREFERENCE[lessonClass]) {
        for (let i = 0; i < dayConfigs.length; i++) {
            if (getDayClass(dayConfigs[i]) === targetClass) {
                result.push({ idx: i, dayClass: targetClass });
            }
        }
    }
    return result;
}
function creates3Consecutive(newIdx, placedDays) {
    let streak = 1;
    let i = newIdx - 1;
    while (placedDays.has(i)) {
        streak++;
        i--;
    }
    i = newIdx + 1;
    while (placedDays.has(i)) {
        streak++;
        i++;
    }
    return streak >= 3;
}
function step8Placement(lessonOrder, lessonAllocations, dayConfigs, freeWindows, preferredStudyTime) {
    const placed = [];
    const notFitted = {};
    const dayBlocksRemaining = dayConfigs.map((d) => d.maxBlocks);
    const preferredRange = getPreferredRange(preferredStudyTime);
    let programZorlastu = false;
    for (const { lessonId, slottedMode, difficulty, priority } of lessonOrder) {
        let remaining = lessonAllocations[lessonId] ?? 0;
        const placedDays = new Set();
        const lessonClass = classifyLesson(difficulty, priority);
        const preferredIntensity = getDayIntensity(DAY_PREFERENCE[lessonClass][0]);
        const dayOrder = getDayOrder(lessonClass, dayConfigs);
        for (const { idx: dayIdx, dayClass } of dayOrder) {
            if (remaining <= 0)
                break;
            if (dayBlocksRemaining[dayIdx] <= 0)
                continue;
            if (slottedMode && creates3Consecutive(dayIdx, placedDays))
                continue;
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
                    placed.push({ lessonId, date: day.date, startMin: effStart, endMin: effStart + neededMin, blockCount: toPlace, isReview: false });
                    windows.splice(i, 1, ...splitWindow(w, effStart, effStart + neededMin));
                    placedOk = true;
                    break;
                }
            }
            if (!placedOk) {
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
//# sourceMappingURL=step8-placement.js.map