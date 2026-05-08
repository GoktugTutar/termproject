"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step0Burnout = step0Burnout;
function step0Burnout(completedBlocks, plannedBlocks, currentMax) {
    if (plannedBlocks === 0) {
        return { maxBlocksPerSession: currentMax, burnoutDetected: false };
    }
    const weekCompletionRate = completedBlocks / plannedBlocks;
    if (weekCompletionRate < 0.7) {
        return {
            maxBlocksPerSession: Math.max(1, currentMax - 1),
            burnoutDetected: true,
        };
    }
    return { maxBlocksPerSession: currentMax, burnoutDetected: false };
}
//# sourceMappingURL=step0-burnout.js.map