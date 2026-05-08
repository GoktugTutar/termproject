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
exports.FeedbackService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const time_util_1 = require("../utils/time.util");
let FeedbackService = class FeedbackService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async saveWeeklyFeedback(userId, dto) {
        const now = (0, time_util_1.getCurrentTime)();
        const weekStart = this.getWeekStart(now);
        const existingFeedback = await this.prisma.weeklyFeedback.findFirst({
            where: { userId, weekStart },
        });
        let feedback;
        if (existingFeedback) {
            feedback = await this.prisma.weeklyFeedback.update({
                where: { id: existingFeedback.id },
                data: { weekloadFeedback: dto.weekloadFeedback },
                include: { lessonFeedbacks: true },
            });
        }
        else {
            feedback = await this.prisma.weeklyFeedback.create({
                data: {
                    userId,
                    weekStart,
                    weekloadFeedback: dto.weekloadFeedback,
                    lessonFeedbacks: {
                        create: dto.lessonFeedbacks.map((lf) => ({
                            lessonId: lf.lessonId,
                            needsMoreTime: lf.needsMoreTime,
                        })),
                    },
                },
                include: { lessonFeedbacks: true },
            });
        }
        for (const lf of dto.lessonFeedbacks) {
            await this.prisma.lesson.update({
                where: { id: lf.lessonId },
                data: { needsMoreTime: lf.needsMoreTime },
            });
        }
        return feedback;
    }
    async getMessages(userId) {
        const now = (0, time_util_1.getCurrentTime)();
        const messages = [];
        const recentFeedbacks = await this.prisma.weeklyFeedback.findMany({
            where: { userId },
            orderBy: { weekStart: 'desc' },
            take: 3,
        });
        const lessons = await this.prisma.lesson.findMany({
            where: { userId },
            include: { exams: true },
        });
        if (recentFeedbacks.length >= 2) {
            const last2 = recentFeedbacks.slice(0, 2);
            if (last2.every((f) => f.weekloadFeedback === 'cok_yogundu')) {
                messages.push({
                    type: 'asiri_yuk',
                    message: 'İki haftadır program çok yoğun geliyor. Önümüzdeki hafta otomatik %15 hafifletildi.',
                    suggestion: "BusyTime'ları gözden geçirmeyi düşün.",
                });
            }
        }
        for (const lesson of lessons) {
            const u = this.daysUntilExam(lesson, now);
            if (u !== null && u <= 7) {
                messages.push({
                    type: 'sinav_yakin',
                    message: `${lesson.name} sınavına ${u} gün kaldı. Öncelik KRİTİK'e alındı.`,
                    suggestion: 'Bu derse bu hafta daha fazla zaman ayır.',
                });
            }
        }
        for (const lesson of lessons) {
            if (lesson.keyfiDelayCount >= 2) {
                messages.push({
                    type: 'sik_erteleme',
                    message: `${lesson.name} sık erteleniyor, slotlu mod devreye alındı.`,
                    suggestion: 'Bu dersi en az her 3 günde bir planlaman önerilir.',
                });
            }
        }
        return messages;
    }
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    daysUntilExam(lesson, now) {
        if (lesson.exams.length === 0)
            return null;
        const future = lesson.exams
            .map((e) => Math.ceil((new Date(e.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            .filter((d) => d >= 0);
        return future.length > 0 ? Math.min(...future) : null;
    }
};
exports.FeedbackService = FeedbackService;
exports.FeedbackService = FeedbackService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FeedbackService);
//# sourceMappingURL=feedback.service.js.map