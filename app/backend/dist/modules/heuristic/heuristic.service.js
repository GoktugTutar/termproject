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
    daysUntilExam(examDate, today) {
        const exam = new Date(examDate);
        const diffMs = exam.getTime() - today.getTime();
        return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
    calcUrgency(daysLeft) {
        return 1 / (daysLeft + 1);
    }
    calcRemaining(lesson) {
        if (lesson.allocatedHours === 0)
            return 0;
        return lesson.remaining / lesson.allocatedHours;
    }
    calcDelayBonus(delay) {
        return delay > 0 ? 1 : 0;
    }
    calcScore(input) {
        const { lesson, stress, today } = input;
        const daysLeft = this.daysUntilExam(lesson.examDate, today);
        const U = this.calcUrgency(daysLeft);
        const R = this.calcRemaining(lesson);
        const D = lesson.difficulty;
        const S = stress;
        const B = this.calcDelayBonus(lesson.delay);
        const H = W1 * U + W2 * R + W3 * ((D * S) / 30) + W4 * B;
        return Math.round(H * 1000) / 1000;
    }
    calcStudyHours(lesson, allLessons) {
        const totalDifficulty = allLessons.reduce((sum, l) => sum + l.difficulty, 0);
        if (totalDifficulty === 0)
            return 0;
        const X = (14 * lesson.difficulty) / totalDifficulty;
        return Math.round(X * 10) / 10;
    }
    rankLessons(lessons, stress, today) {
        const results = lessons.map((lesson) => ({
            lessonId: lesson.id,
            lessonName: lesson.lessonName,
            score: this.calcScore({ lesson, stress, today }),
            studyHours: this.calcStudyHours(lesson, lessons),
        }));
        return results.sort((a, b) => b.score - a.score);
    }
};
exports.HeuristicService = HeuristicService;
exports.HeuristicService = HeuristicService = __decorate([
    (0, common_1.Injectable)()
], HeuristicService);
//# sourceMappingURL=heuristic.service.js.map