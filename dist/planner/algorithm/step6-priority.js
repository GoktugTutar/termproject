"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step6Priority = step6Priority;
function uToPriority(u) {
    if (u <= 3)
        return 'KRITIK';
    if (u <= 7)
        return 'YUKSEK';
    if (u <= 14)
        return 'ORTA';
    return 'DUSUK';
}
function priorityScore(level) {
    switch (level) {
        case 'KRITIK': return 4;
        case 'YUKSEK': return 3;
        case 'ORTA': return 2;
        case 'DUSUK': return 1;
    }
}
function daysUntilExam(lesson, now) {
    const exams = lesson.exams || [];
    if (exams.length === 0)
        return 999;
    const future = exams
        .map((e) => Math.ceil((new Date(e.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        .filter((d) => d >= 0);
    return future.length > 0 ? Math.min(...future) : 999;
}
function step6Priority(lessons, now) {
    return lessons
        .map((lesson) => {
        const u = daysUntilExam(lesson, now);
        const totalDelay = lesson.keyfiDelayCount + lesson.zorunluDelayCount;
        let level = uToPriority(u);
        if (totalDelay >= 3) {
            const levels = ['DUSUK', 'ORTA', 'YUKSEK', 'KRITIK'];
            const idx = levels.indexOf(level);
            if (idx < levels.length - 1)
                level = levels[idx + 1];
        }
        const slottedMode = lesson.keyfiDelayCount > 0;
        return {
            lessonId: lesson.id,
            priority: level,
            priorityScore: priorityScore(level) * 10 + lesson.difficulty,
            slottedMode,
        };
    })
        .sort((a, b) => b.priorityScore - a.priorityScore);
}
//# sourceMappingURL=step6-priority.js.map