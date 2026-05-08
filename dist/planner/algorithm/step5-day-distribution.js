"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step5DayDistribution = step5DayDistribution;
function largestRemainder(weights, total) {
    const floors = weights.map((w) => Math.floor(w));
    const remainders = weights.map((w, i) => ({ index: i, remainder: w - floors[i] }));
    const remaining = total - floors.reduce((a, b) => a + b, 0);
    remainders.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < remaining; i++) {
        floors[remainders[i].index] += 1;
    }
    return floors;
}
function step5DayDistribution(effectiveBlocks, weekDays, studyStyle, maxBlocksPerSessionFromBurnout) {
    const dayFatigue = weekDays.map((day) => {
        if (day.busySlots.length === 0)
            return 1;
        const sum = day.busySlots.reduce((a, b) => a + b.fatigueLevel, 0);
        return sum / day.busySlots.length;
    });
    const weights = dayFatigue.map((f) => 6 - f);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let dayBlocks;
    if (totalWeight === 0) {
        dayBlocks = weekDays.map(() => 0);
    }
    else {
        const proportional = weights.map((w) => (effectiveBlocks * w) / totalWeight);
        dayBlocks = largestRemainder(proportional, effectiveBlocks);
    }
    return weekDays.map((day, i) => {
        const avgFatigue = dayFatigue[i];
        const isCokYorucu = avgFatigue >= 4;
        const isRahat = avgFatigue <= 2;
        let maxSessions;
        let maxBlocksPerSession;
        switch (studyStyle) {
            case 'deep_focus':
                maxSessions = 1;
                maxBlocksPerSession = Math.min(4, maxBlocksPerSessionFromBurnout);
                break;
            case 'distributed':
                maxSessions = 3;
                maxBlocksPerSession = Math.min(2, maxBlocksPerSessionFromBurnout);
                break;
            default:
                maxSessions = 2;
                maxBlocksPerSession = Math.min(3, maxBlocksPerSessionFromBurnout);
                break;
        }
        if (isCokYorucu)
            maxSessions = 1;
        const maxBlocks = maxSessions * maxBlocksPerSession;
        return {
            date: day.date,
            dayOfWeek: day.dayOfWeek,
            maxBlocks: Math.min(dayBlocks[i], maxBlocks),
            maxSessions,
            maxBlocksPerSession,
            avgFatigue,
            isCokYorucu,
            isRahat,
        };
    });
}
//# sourceMappingURL=step5-day-distribution.js.map