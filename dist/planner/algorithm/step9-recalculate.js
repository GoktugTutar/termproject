"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step9Recalculate = step9Recalculate;
function step9Recalculate(lessonAllocations, completedBlocksByLesson) {
    const remaining = {};
    for (const [lessonIdStr, allocated] of Object.entries(lessonAllocations)) {
        const lessonId = parseInt(lessonIdStr);
        const completed = completedBlocksByLesson[lessonId] ?? 0;
        const left = allocated - completed;
        if (left > 0) {
            remaining[lessonId] = left;
        }
    }
    return remaining;
}
//# sourceMappingURL=step9-recalculate.js.map