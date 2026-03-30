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
const date_utils_js_1 = require("../../common/utils/date.utils.js");
const W1 = -0.5;
const W2 = 1.0;
const W3 = 0.3;
const W4 = 2.0;
let HeuristicService = class HeuristicService {
    calculateX(lesson, allLessons) {
        const totalD = allLessons.reduce((sum, l) => sum + l.difficulty, 0);
        if (totalD === 0)
            return 0;
        return (14 * lesson.difficulty) / totalD;
    }
    calculateU(lesson, now = new Date()) {
        const vize = lesson.vizeDate ? new Date(lesson.vizeDate) : null;
        const final = lesson.finalDate ? new Date(lesson.finalDate) : null;
        if (vize && vize > now)
            return (0, date_utils_js_1.daysBetween)(now, vize);
        if (final && final > now)
            return (0, date_utils_js_1.daysBetween)(now, final);
        return 0;
    }
    calculateR(lesson, allLessons, weekChecklists, isFirstDay) {
        const X = this.calculateX(lesson, allLessons);
        if (isFirstDay || weekChecklists.length === 0)
            return X;
        const completed = weekChecklists.reduce((sum, checklist) => {
            const entry = checklist.lessons.find((l) => l.lessonId === lesson.id);
            if (!entry || entry.hoursCompleted === null)
                return sum;
            if (entry.hoursCompleted >= 9999)
                return sum + X;
            return sum + Math.max(0, entry.hoursCompleted);
        }, 0);
        return Math.max(0, X - completed);
    }
    calculateH(U, R, D, S, B) {
        return W1 * U + W2 * R + W3 * D * S + W4 * B;
    }
    calculate(lesson, allLessons, user, weekChecklists, isFirstDay) {
        const X = this.calculateX(lesson, allLessons);
        const U = this.calculateU(lesson);
        const R = this.calculateR(lesson, allLessons, weekChecklists, isFirstDay);
        const D = lesson.difficulty;
        const S = user.stressLevel ?? 1;
        const B = lesson.delayCount;
        const H = this.calculateH(U, R, D, S, B);
        return { lessonId: lesson.id, lessonName: lesson.name, H, U, R, X, D, S, B };
    }
    rankLessons(lessons, user, weekChecklists, isFirstDay) {
        return lessons
            .map((lesson) => this.calculate(lesson, lessons, user, weekChecklists, isFirstDay))
            .sort((a, b) => b.H - a.H);
    }
};
exports.HeuristicService = HeuristicService;
exports.HeuristicService = HeuristicService = __decorate([
    (0, common_1.Injectable)()
], HeuristicService);
//# sourceMappingURL=heuristic.service.js.map