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
exports.ChecklistService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const checklist_entity_js_1 = require("./checklist.entity.js");
const lesson_service_js_1 = require("../lesson/lesson.service.js");
const schedule_entity_js_1 = require("../planner/schedule.entity.js");
const date_utils_js_1 = require("../../common/utils/date.utils.js");
let ChecklistService = class ChecklistService {
    repo;
    scheduleRepo;
    lessonService;
    constructor(repo, scheduleRepo, lessonService) {
        this.repo = repo;
        this.scheduleRepo = scheduleRepo;
        this.lessonService = lessonService;
    }
    async createForToday(userId) {
        if ((0, date_utils_js_1.getDayName)() === 'sunday') {
            throw new common_1.BadRequestException('Pazar günü checklist oluşturulmaz. Yeni haftanın programını oluşturmak için /planner/create kullanın.');
        }
        const today = (0, date_utils_js_1.todayString)();
        const existing = await this.repo.findOne({
            where: { userId, date: today },
        });
        if (existing)
            return existing;
        const schedule = await this.scheduleRepo.findOne({
            where: { userId },
            order: { startDate: 'DESC' },
        });
        if (!schedule) {
            throw new common_1.NotFoundException('No schedule found. Run /planner/create first.');
        }
        const dayName = (0, date_utils_js_1.getDayName)();
        const todaySlots = schedule.schedule[dayName] ?? {};
        const hoursMap = new Map();
        for (const [range, value] of Object.entries(todaySlots)) {
            if (value.startsWith('busy:'))
                continue;
            const [s, e] = range.split('-').map(Number);
            hoursMap.set(value, (hoursMap.get(value) ?? 0) + (e - s));
        }
        const lessons = [...hoursMap.entries()].map(([lessonId, allocatedHours]) => ({
            lessonId,
            allocatedHours,
            hoursCompleted: null,
        }));
        if (lessons.length === 0) {
            throw new common_1.BadRequestException('Bugun icin planlanmis calisma bulunmuyor. Kontrol listesi olusturulamaz.');
        }
        const checklist = this.repo.create({
            userId,
            date: today,
            lessons,
            submitted: false,
        });
        return this.repo.save(checklist);
    }
    async getTodayChecklist(userId) {
        const today = (0, date_utils_js_1.todayString)();
        const checklist = await this.repo.findOne({
            where: { userId, date: today },
        });
        if (!checklist)
            throw new common_1.NotFoundException('No checklist for today');
        return {
            id: checklist.id,
            date: checklist.date,
            submitted: checklist.submitted,
            lessons: checklist.lessons.map((l) => ({
                lessonId: l.lessonId,
                allocatedHours: l.allocatedHours,
                remainingHours: l.hoursCompleted === null
                    ? l.allocatedHours
                    : Math.max(0, l.allocatedHours - Math.abs(l.hoursCompleted)),
                hoursCompleted: l.hoursCompleted,
            })),
        };
    }
    async submit(userId, dto) {
        const today = (0, date_utils_js_1.todayString)();
        const checklist = await this.repo.findOne({
            where: { userId, date: today },
        });
        if (!checklist)
            throw new common_1.NotFoundException('No checklist for today');
        if (checklist.submitted)
            throw new common_1.BadRequestException('Already submitted');
        const submissionMap = new Map(dto.lessons.map((l) => [l.lessonId, l.hoursCompleted]));
        for (const entry of checklist.lessons) {
            const hours = submissionMap.get(entry.lessonId);
            if (hours === undefined)
                continue;
            const previousHours = entry.hoursCompleted;
            entry.hoursCompleted = hours;
            const isDelay = hours < 0 || hours === -9999;
            const wasDelay = previousHours !== null &&
                (previousHours < 0 || previousHours === -9999);
            if (isDelay && !wasDelay) {
                await this.lessonService.incrementDelay(entry.lessonId);
            }
        }
        checklist.submitted = checklist.lessons.every((lesson) => lesson.hoursCompleted !== null);
        return this.repo.save(checklist);
    }
    async getWeekChecklists(userId) {
        const now = new Date();
        const day = now.getDay();
        const diffToMon = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return this.repo.find({
            where: {
                userId,
                date: (0, typeorm_2.Between)(monday.toISOString().split('T')[0], sunday.toISOString().split('T')[0]),
            },
        });
    }
    async isTodaySubmitted(userId) {
        const today = (0, date_utils_js_1.todayString)();
        const checklist = await this.repo.findOne({
            where: { userId, date: today },
        });
        return checklist?.submitted ?? false;
    }
    async getEarlyCompletedIds(userId) {
        const checklists = await this.getWeekChecklists(userId);
        const ids = new Set();
        for (const cl of checklists) {
            for (const l of cl.lessons) {
                if (l.hoursCompleted === 9999)
                    ids.add(l.lessonId);
            }
        }
        return [...ids];
    }
};
exports.ChecklistService = ChecklistService;
exports.ChecklistService = ChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(checklist_entity_js_1.ChecklistEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(schedule_entity_js_1.ScheduleEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        lesson_service_js_1.LessonService])
], ChecklistService);
//# sourceMappingURL=checklist.service.js.map