"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeuristicService = void 0;
const common_1 = require("@nestjs/common");
const W1 = 0.4;
const W2 = 0.3;
const W3 = 0.2;
const W4 = 0.1;
let HeuristicService = class HeuristicService {
    getNextExamDate(lesson, today) {
        const midterms = lesson.deadlines
            .filter((d) => d.type === 'midterm')
            .map((d) => d.date)
            .sort();
        const finals = lesson.deadlines
            .filter((d) => d.type === 'final')
            .map((d) => d.date)
            .sort();
        const todayStr = today.toISOString().split('T')[0];
        const upcomingMidterm = midterms.find((d) => d >= todayStr);
        if (upcomingMidterm)
            return upcomingMidterm;
        const upcomingFinal = finals.find((d) => d >= todayStr);
        return upcomingFinal ?? null;
    }
    calcUrgency(lesson, today) {
        const examDate = this.getNextExamDate(lesson, today);
        if (!examDate)
            return { U: 0, daysLeft: Infinity };
        const exam = new Date(examDate);
        const diffMs = exam.getTime() - today.getTime();
        const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const U = 1 / (daysLeft + 1);
        return { U, daysLeft };
    }
    calcScore(input, allLessons) {
        const { lesson, stress, today } = input;
        const { U, daysLeft } = this.calcUrgency(lesson, today);
        const D = lesson.difficulty;
        const S = stress;
        const B = lesson.delay > 0 ? 1 : 0;
        const R = Math.min(1, lesson.delay / 5);
        const H = W1 * U + W2 * R + W3 * ((D * S) / 50) + W4 * B;
        void daysLeft;
        return Math.round(H * 1000) / 1000;
    }
    calcStudyHours(lesson, allLessons) {
        const totalDifficulty = allLessons.reduce((sum, l) => sum + l.difficulty, 0);
        if (totalDifficulty === 0)
            return 0;
        return Math.round(((14 * lesson.difficulty) / totalDifficulty) * 10) / 10;
    }
    rankLessons(lessons, stress, today) {
        const results = lessons.map((lesson) => {
            const { daysLeft } = this.calcUrgency(lesson, today);
            return {
                lessonId: lesson.id,
                lessonName: lesson.lessonName,
                score: this.calcScore({ lesson, stress, today }, lessons),
                studyHours: this.calcStudyHours(lesson, lessons),
                urgencyDays: daysLeft === Infinity ? -1 : daysLeft,
            };
        });
        return results.sort((a, b) => b.score - a.score);
    }
};
exports.HeuristicService = HeuristicService;
exports.HeuristicService = HeuristicService = __decorate([
    (0, common_1.Injectable)()
], HeuristicService);
//# sourceMappingURL=heuristic.service.js.map