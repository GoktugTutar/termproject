"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step3ReviewBlocks = step3ReviewBlocks;
function step3ReviewBlocks(lessons, effectiveBlocks, weekStart, weekEnd) {
    const totalDifficulty = lessons.reduce((sum, l) => sum + l.difficulty, 0);
    const reviewBlocks = [];
    const reservedByLesson = {};
    for (const lesson of lessons) {
        const examsThisWeek = lesson.exams.filter((e) => {
            const d = new Date(e.examDate);
            return d >= weekStart && d <= weekEnd;
        });
        if (examsThisWeek.length === 0)
            continue;
        const examDate = new Date(examsThisWeek[0].examDate);
        const reviewBase = totalDifficulty > 0
            ? (effectiveBlocks * lesson.difficulty) / totalDifficulty
            : 0;
        let totalReserved = 0;
        if (lesson.difficulty < 4) {
            const day1 = new Date(examDate);
            day1.setDate(day1.getDate() - 1);
            if (day1 >= weekStart) {
                const blocks = Math.max(1, Math.min(4, Math.round(reviewBase * 0.25)));
                reviewBlocks.push({ lessonId: lesson.id, date: day1, blocks });
                totalReserved += blocks;
            }
        }
        else {
            const day1 = new Date(examDate);
            day1.setDate(day1.getDate() - 1);
            if (day1 >= weekStart) {
                const blocks = Math.max(1, Math.min(4, Math.round(reviewBase * 0.20)));
                reviewBlocks.push({ lessonId: lesson.id, date: day1, blocks });
                totalReserved += blocks;
            }
            const day2 = new Date(examDate);
            day2.setDate(day2.getDate() - 2);
            if (day2 >= weekStart) {
                const blocks = Math.max(1, Math.min(4, Math.round(reviewBase * 0.20)));
                reviewBlocks.push({ lessonId: lesson.id, date: day2, blocks });
                totalReserved += blocks;
            }
        }
        reservedByLesson[lesson.id] = totalReserved;
    }
    return { reviewBlocks, reservedByLesson };
}
//# sourceMappingURL=step3-review-blocks.js.map