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
const MAX_LESSON_BLOCKS_FREE_DAY = 3;
const MAX_LESSON_BLOCKS_BUSY_DAY = 2;
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
        const { startDate, endDate } = this.currentWeekRange();
        const today = (0, date_utils_js_1.todayString)();
        const dayName = (0, date_utils_js_1.getDayName)();
        const existing = await this.scheduleRepo.findOne({ where: { userId, startDate } });
        if (existing?.lastUpdatedDate === today) {
            return existing;
        }
        if (existing && dayName !== 'sunday') {
            const submitted = await this.checklistService.isTodaySubmitted(userId);
            if (!submitted) {
                throw new common_1.BadRequestException('Programı güncellemek için önce bugünün checklistini doldurmanız gerekiyor.');
            }
        }
        const [user, lessons, weekChecklists, earlyIds] = await Promise.all([
            this.userService.findById(userId),
            this.lessonService.findByUserId(userId),
            this.checklistService.getWeekChecklists(userId),
            this.checklistService.getEarlyCompletedIds(userId),
        ]);
        if (!user)
            return null;
        const isFirstCall = !existing;
        const ranked = this.heuristicService.rankLessons(lessons, user, weekChecklists, isFirstCall);
        const activeLessons = ranked.filter((r) => !earlyIds.includes(r.lessonId));
        if (isFirstCall) {
            const schedule = this.buildFullWeek(activeLessons, user.busyTimes ?? {});
            const entity = this.scheduleRepo.create({
                userId, startDate, endDate, schedule, lastUpdatedDate: today,
            });
            return this.scheduleRepo.save(entity);
        }
        existing.schedule = this.updateFutureDays(existing.schedule, activeLessons, user.busyTimes ?? {});
        existing.lastUpdatedDate = today;
        return this.scheduleRepo.save(existing);
    }
    async getSchedule(userId) {
        const { startDate } = this.currentWeekRange();
        const schedule = await this.scheduleRepo.findOne({ where: { userId, startDate } });
        if (!schedule) {
            throw new common_1.NotFoundException('Bu hafta için program bulunamadı. Lütfen önce günlük checklistinizi doldurun.');
        }
        return schedule;
    }
    buildFullWeek(ranked, busyTimes) {
        const remaining = new Map(ranked.map((r) => [r.lessonId, Math.max(1, Math.ceil(r.X))]));
        return this.fillDays(DAYS, ranked, remaining, busyTimes);
    }
    updateFutureDays(existingSchedule, ranked, busyTimes) {
        const todayIndex = DAYS.indexOf((0, date_utils_js_1.getDayName)());
        const newSchedule = {};
        for (let i = 0; i <= todayIndex; i++) {
            newSchedule[DAYS[i]] = existingSchedule[DAYS[i]] ?? {};
        }
        const futureDays = DAYS.slice(todayIndex + 1);
        if (futureDays.length === 0)
            return newSchedule;
        const remaining = new Map(ranked.map((r) => [r.lessonId, Math.max(0, Math.ceil(r.R))]));
        const filledFuture = this.fillDays(futureDays, ranked, remaining, busyTimes);
        for (const day of futureDays) {
            newSchedule[day] = filledFuture[day];
        }
        return newSchedule;
    }
    fillDays(days, ranked, remaining, busyTimes) {
        const schedule = {};
        for (const day of days) {
            schedule[day] = {};
            const busyDay = busyTimes[day] ?? {};
            const busyEntries = this.normalizeBusyEntries(busyDay);
            for (const busyEntry of busyEntries) {
                schedule[day][(0, date_utils_js_1.formatTimeRange)(busyEntry.start, busyEntry.end)] =
                    `busy:${busyEntry.label}`;
            }
            const freeRanges = this.buildFreeRanges(busyEntries);
            const maxLessonBlocks = busyEntries.length > 0
                ? MAX_LESSON_BLOCKS_BUSY_DAY
                : MAX_LESSON_BLOCKS_FREE_DAY;
            let freeRangeIndex = 0;
            let lessonBlocksPlaced = 0;
            for (const { lessonId } of ranked) {
                if (freeRangeIndex >= freeRanges.length ||
                    lessonBlocksPlaced >= maxLessonBlocks) {
                    break;
                }
                const rem = remaining.get(lessonId) ?? 0;
                if (rem <= 0)
                    continue;
                const currentRange = freeRanges[freeRangeIndex];
                const availableHours = currentRange.end - currentRange.start;
                if (availableHours <= 0) {
                    freeRangeIndex++;
                    continue;
                }
                const assign = Math.min(rem, MAX_HOURS_PER_LESSON_PER_DAY, availableHours);
                if (assign <= 0)
                    continue;
                const start = currentRange.start;
                const end = start + assign;
                schedule[day][(0, date_utils_js_1.formatTimeRange)(start, end)] = lessonId;
                remaining.set(lessonId, rem - assign);
                currentRange.start += assign;
                lessonBlocksPlaced++;
                if (currentRange.start >= currentRange.end) {
                    freeRangeIndex++;
                }
            }
        }
        return schedule;
    }
    normalizeBusyEntries(busyDay) {
        return Object.entries(busyDay)
            .map(([range, label]) => {
            const [rawStart, rawEnd] = range.split('-').map(Number);
            const start = Math.max(WORK_START, rawStart);
            const end = Math.min(WORK_END, rawEnd);
            return {
                start,
                end,
                label: label?.trim() || 'Mesgul',
            };
        })
            .filter((entry) => Number.isFinite(entry.start)
            && Number.isFinite(entry.end)
            && entry.end > entry.start)
            .sort((a, b) => a.start - b.start);
    }
    buildFreeRanges(busyEntries) {
        const busyHours = this.expandBusyHours(busyEntries);
        const ranges = [];
        let rangeStart = null;
        for (let hour = WORK_START; hour < WORK_END; hour++) {
            if (!busyHours.has(hour)) {
                rangeStart ??= hour;
                continue;
            }
            if (rangeStart !== null) {
                ranges.push({ start: rangeStart, end: hour });
                rangeStart = null;
            }
        }
        if (rangeStart !== null) {
            ranges.push({ start: rangeStart, end: WORK_END });
        }
        return ranges;
    }
    expandBusyHours(busyEntries) {
        const hours = new Set();
        for (const entry of busyEntries) {
            for (let h = entry.start; h < entry.end; h++)
                hours.add(h);
        }
        return hours;
    }
    currentWeekRange() {
        const now = new Date();
        const day = now.getDay();
        const diffToMon = day === 0 ? 1 : 1 - day;
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