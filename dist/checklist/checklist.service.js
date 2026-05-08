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
exports.ChecklistService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const time_util_1 = require("../utils/time.util");
let ChecklistService = class ChecklistService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async submit(userId, dto) {
        const now = (0, time_util_1.getCurrentTime)();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        let checklist = await this.prisma.dailyChecklist.findFirst({
            where: { userId, date: { gte: today, lt: tomorrow } },
            include: { items: true },
        });
        if (!checklist) {
            checklist = await this.prisma.dailyChecklist.create({
                data: {
                    userId,
                    date: today,
                    stressLevel: dto.stressLevel,
                    fatigueLevel: dto.fatigueLevel,
                },
                include: { items: true },
            });
        }
        else {
            await this.prisma.dailyChecklist.update({
                where: { id: checklist.id },
                data: { stressLevel: dto.stressLevel, fatigueLevel: dto.fatigueLevel },
            });
        }
        for (const item of dto.items) {
            const existing = await this.prisma.checklistItem.findFirst({
                where: { checklistId: checklist.id, lessonId: item.lessonId },
            });
            if (existing) {
                await this.prisma.checklistItem.update({
                    where: { id: existing.id },
                    data: {
                        plannedBlocks: item.plannedBlocks,
                        completedBlocks: item.completedBlocks,
                        delayed: item.delayed ?? false,
                    },
                });
            }
            else {
                await this.prisma.checklistItem.create({
                    data: {
                        checklistId: checklist.id,
                        lessonId: item.lessonId,
                        plannedBlocks: item.plannedBlocks,
                        completedBlocks: item.completedBlocks,
                        delayed: item.delayed ?? false,
                    },
                });
            }
            if (item.delayed) {
                await this.prisma.lesson.update({
                    where: { id: item.lessonId },
                    data: { keyfiDelayCount: { increment: 1 } },
                });
            }
        }
        return this.getByDate(userId, today.toISOString().substring(0, 10));
    }
    async getByDate(userId, dateStr) {
        const date = new Date(dateStr);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        return this.prisma.dailyChecklist.findFirst({
            where: { userId, date: { gte: date, lt: nextDay } },
            include: { items: true },
        });
    }
};
exports.ChecklistService = ChecklistService;
exports.ChecklistService = ChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChecklistService);
//# sourceMappingURL=checklist.service.js.map