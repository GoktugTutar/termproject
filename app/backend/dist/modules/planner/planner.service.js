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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_entity_js_1 = require("./schedule.entity.js");
const heuristic_service_js_1 = require("../heuristic/heuristic.service.js");
const lesson_service_js_1 = require("../lesson/lesson.service.js");
const user_service_js_1 = require("../user/user.service.js");
const checklist_service_js_1 = require("../checklist/checklist.service.js");
const date_utils_js_1 = require("../../common/utils/date.utils.js");
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WORK_START = 8;
const WORK_END = 22;
const MAX_HOURS_PER_LESSON_PER_DAY = 3;
let PlannerService = class PlannerService {
    scheduleRepo;
    heuristicService;
    lessonService;
    userService;
    checklistService;
    constructor(scheduleRepo, heuristicService, lessonService, userService, checklistService) {
        this.scheduleRepo = scheduleRepo;
        this.heuristicService = heuristicService;
        this.lessonService = lessonService;
        this.userService = userService;
        this.checklistService = checklistService;
    }
    async create(userId) {
        const [user, lessons, weekChecklists, earlyIds] = await Promise.all([
            this.userService.findById(userId),
            this.lessonService.findByUserId(userId),
            this.checklistService.getWeekChecklists(userId),
            this.checklistService.getEarlyCompletedIds(userId),
        ]);
        if (!user)
            return null;
        const firstDay = (0, date_utils_js_1.isMonday)();
        const ranked = this.heuristicService.rankLessons(lessons, user, weekChecklists, firstDay);
        const activeLessons = ranked.filter((r) => !earlyIds.includes(r.lessonId));
        const schedule = this.buildWeeklySchedule(activeLessons, user.busyTimes ?? {});
        const { startDate, endDate } = this.currentWeekRange();
        const existing = await this.scheduleRepo.findOne({ where: { userId, startDate } });
        if (existing) {
            existing.schedule = schedule;
            existing.endDate = endDate;
            return this.scheduleRepo.save(existing);
        }
        const entity = this.scheduleRepo.create({ userId, startDate, endDate, schedule });
        return this.scheduleRepo.save(entity);
    }
    async getSchedule(userId) {
        return this.scheduleRepo.findOne({
            where: { userId },
            order: { startDate: 'DESC' },
        });
    }
    buildWeeklySchedule(ranked, busyTimes) {
        const remaining = new Map(ranked.map((r) => [r.lessonId, Math.max(1, Math.ceil(r.X))]));
        const schedule = {};
        for (const day of DAYS) {
            schedule[day] = {};
            const busyDay = busyTimes[day] ?? {};
            for (const [range, label] of Object.entries(busyDay)) {
                schedule[day][range] = `busy:${label}`;
            }
            const busyHours = this.expandBusyHours(busyDay);
            const freeHours = [];
            for (let h = WORK_START; h < WORK_END; h++) {
                if (!busyHours.has(h))
                    freeHours.push(h);
            }
            let slotPtr = 0;
            for (const { lessonId } of ranked) {
                const rem = remaining.get(lessonId) ?? 0;
                if (rem <= 0 || slotPtr >= freeHours.length)
                    continue;
                const todayHours = Math.min(rem, MAX_HOURS_PER_LESSON_PER_DAY);
                const available = freeHours.length - slotPtr;
                const assign = Math.min(todayHours, available);
                if (assign > 0) {
                    const start = freeHours[slotPtr];
                    const end = freeHours[slotPtr + assign - 1] + 1;
                    schedule[day][(0, date_utils_js_1.formatTimeRange)(start, end)] = lessonId;
                    remaining.set(lessonId, rem - assign);
                    slotPtr += assign;
                }
            }
        }
        return schedule;
    }
    expandBusyHours(busyDay) {
        const hours = new Set();
        for (const range of Object.keys(busyDay)) {
            const [s, e] = range.split('-').map(Number);
            for (let h = s; h < e; h++)
                hours.add(h);
        }
        return hours;
    }
    currentWeekRange() {
        const now = new Date();
        const day = now.getDay();
        const diffToMon = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return {
            startDate: monday.toISOString().split('T')[0],
            endDate: sunday.toISOString().split('T')[0],
        };
    }
};
exports.PlannerService = PlannerService;
exports.PlannerService = PlannerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(schedule_entity_js_1.ScheduleEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        heuristic_service_js_1.HeuristicService,
        lesson_service_js_1.LessonService,
        user_service_js_1.UserService,
        checklist_service_js_1.ChecklistService])
], PlannerService);
//# sourceMappingURL=planner.service.js.map