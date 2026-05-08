"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step4CalculateX = step4CalculateX;
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
function step4CalculateX(lessons, effectiveBlocks) {
    if (lessons.length === 0)
        return [];
    const weights = lessons.map((lesson) => {
        const totalDelay = lesson.keyfiDelayCount + lesson.zorunluDelayCount;
        const delayBonus = Math.min(totalDelay, 2);
        let effectiveWeight;
        if (totalDelay > 0) {
            effectiveWeight = lesson.difficulty + delayBonus;
        }
        else {
            effectiveWeight = Math.max(1, lesson.difficulty + lesson.needsMoreTime);
        }
        return effectiveWeight;
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (totalWeight === 0) {
        return lessons.map((l) => ({ lessonId: l.id, allocatedBlocks: 0, effectiveBlocks: 0 }));
    }
    const proportional = weights.map((w) => (effectiveBlocks * w) / totalWeight);
    const allocated = largestRemainder(proportional, effectiveBlocks);
    return lessons.map((lesson, i) => {
        const base = allocated[i];
        const extra = lesson.zorunluDelayCount > 0 ? lesson.zorunluMissedBlocks : 0;
        return {
            lessonId: lesson.id,
            allocatedBlocks: base,
            effectiveBlocks: base + extra,
        };
    });
}
//# sourceMappingURL=step4-calculate-x.js.map