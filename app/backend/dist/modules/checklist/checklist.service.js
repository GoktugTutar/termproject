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
const checklist_entity_1 = require("./checklist.entity");
const lesson_service_1 = require("../lesson/lesson.service");
let ChecklistService = class ChecklistService {
    checklistRepo;
    lessonService;
    constructor(checklistRepo, lessonService) {
        this.checklistRepo = checklistRepo;
        this.lessonService = lessonService;
    }
    async getAll(userId) {
        return this.checklistRepo.find({ where: { userId } });
    }
    async getToday(userId) {
        const today = new Date().toISOString().split('T')[0];
        return this.checklistRepo.find({ where: { userId, date: today } });
    }
    async createFromSlots(userId, slots) {
        const today = new Date().toISOString().split('T')[0];
        const entities = slots.map((slot) => this.checklistRepo.create({
            userId,
            lessonId: slot.lessonId,
            lessonName: slot.lessonName,
            date: today,
            plannedHours: slot.hours,
            actualHours: null,
            status: 'pending',
            remaining: null,
        }));
        const saved = await this.checklistRepo.save(entities);
        return saved;
    }
    async submit(userId, dto) {
        const today = new Date().toISOString().split('T')[0];
        let item = await this.checklistRepo.findOne({
            where: { userId, lessonId: dto.lessonId, date: today },
        });
        if (!item) {
            const lesson = await this.lessonService.findById(dto.lessonId);
            if (!lesson)
                throw new common_1.NotFoundException('Ders bulunamadı');
            item = this.checklistRepo.create({
                userId,
                lessonId: dto.lessonId,
                lessonName: lesson.lessonName,
                date: today,
                plannedHours: 0,
                actualHours: null,
                status: 'pending',
                remaining: null,
            });
        }
        let remaining = null;
        const status = dto.status;
        if (status === 'not_done') {
            item.actualHours = 0;
            remaining = null;
        }
        else if (status === 'completed') {
            item.actualHours = item.plannedHours;
            remaining = 0;
        }
        else {
            item.actualHours = dto.actualHours ?? 0;
            remaining = item.plannedHours - item.actualHours;
        }
        item.status = status;
        item.remaining = remaining;
        await this.checklistRepo.save(item);
        await this.lessonService.applyChecklistResult(dto.lessonId, userId, item.plannedHours, status === 'not_done' ? null : item.actualHours);
        return {
            ...item,
            remainingDisplay: this.formatRemaining(status, remaining),
        };
    }
    formatRemaining(status, remaining) {
        if (status === 'not_done')
            return 'inf';
        if (status === 'completed')
            return '0';
        if (remaining === null)
            return 'inf';
        if (remaining < 0)
            return `-${Math.abs(remaining)}`;
        return `${remaining}`;
    }
};
exports.ChecklistService = ChecklistService;
exports.ChecklistService = ChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(checklist_entity_1.ChecklistEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        lesson_service_1.LessonService])
], ChecklistService);
//# sourceMappingURL=checklist.service.js.map