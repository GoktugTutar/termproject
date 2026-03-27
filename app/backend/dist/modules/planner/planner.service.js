"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannerService = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("../user/user.service");
const lesson_service_1 = require("../lesson/lesson.service");
const heuristic_service_1 = require("../heuristic/heuristic.service");
const DAY_LABELS = [
    'Pazar',
    'Pazartesi',
    'Salı',
    'Çarşamba',
    'Perşembe',
    'Cuma',
    'Cumartesi',
];
let PlannerService = class PlannerService {
    userService;
    lessonService;
    heuristicService;
    constructor(userService, lessonService, heuristicService) {
        this.userService = userService;
        this.lessonService = lessonService;
        this.heuristicService = heuristicService;
    }
    createWeeklyPlan(userId) {
        const user = this.userService.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const lessons = this.lessonService.findAllByUser(userId);
        if (lessons.length === 0) {
            return {
                generatedAt: new Date().toISOString(),
                weekStart: this.todayStr(),
                slots: [],
                ranked: [],
            };
        }
        const today = new Date();
        const ranked = this.heuristicService.rankLessons(lessons, user.stress, today);
        const days = this.buildWeekDays(today);
        const slots = [];
        const MAX_HOURS_PER_DAY = 6;
        const MAX_HOURS_PER_LESSON_PER_DAY = 3;
        const dayLoad = {};
        days.forEach((d) => (dayLoad[d.date] = 0));
        for (const result of ranked) {
            let remaining = result.studyHours;
            for (const day of days) {
                if (remaining <= 0)
                    break;
                const available = Math.min(MAX_HOURS_PER_DAY - dayLoad[day.date], MAX_HOURS_PER_LESSON_PER_DAY);
                if (available <= 0)
                    continue;
                const hoursToday = Math.min(remaining, available);
                slots.push({
                    day: day.date,
                    dayLabel: day.label,
                    lessonId: result.lessonId,
                    lessonName: result.lessonName,
                    hours: hoursToday,
                    score: result.score,
                });
                dayLoad[day.date] += hoursToday;
                remaining -= hoursToday;
            }
        }
        return {
            generatedAt: new Date().toISOString(),
            weekStart: days[0].date,
            slots,
            ranked,
        };
    }
    createDailyPlan(userId, freeHours) {
        const user = this.userService.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const lessons = this.lessonService.findAllByUser(userId);
        const today = new Date();
        const todayStr = this.todayStr();
        const dayLabel = DAY_LABELS[today.getDay()];
        if (lessons.length === 0) {
            return { date: todayStr, freeHours, slots: [] };
        }
        const ranked = this.heuristicService.rankLessons(lessons, user.stress, today);
        const slots = [];
        const MAX_PER_LESSON = Math.min(3, freeHours);
        let remainingFree = freeHours;
        for (const result of ranked) {
            if (remainingFree <= 0)
                break;
            const hours = Math.min(remainingFree, MAX_PER_LESSON, result.studyHours / 7);
            const roundedHours = Math.round(hours * 10) / 10;
            if (roundedHours <= 0)
                continue;
            slots.push({
                day: todayStr,
                dayLabel,
                lessonId: result.lessonId,
                lessonName: result.lessonName,
                hours: roundedHours,
                score: result.score,
            });
            remainingFree -= roundedHours;
        }
        return { date: todayStr, freeHours, slots };
    }
    buildWeekDays(from) {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(from);
            d.setDate(from.getDate() + i);
            return {
                date: d.toISOString().split('T')[0],
                label: DAY_LABELS[d.getDay()],
            };
        });
    }
    todayStr() {
        return new Date().toISOString().split('T')[0];
    }
};
exports.PlannerService = PlannerService;
exports.PlannerService = PlannerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService,
        lesson_service_1.LessonService,
        heuristic_service_1.HeuristicService])
], PlannerService);
//# sourceMappingURL=planner.service.js.map