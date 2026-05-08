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
const prisma_service_1 = require("../prisma/prisma.service");
const time_util_1 = require("../utils/time.util");
const step0_burnout_1 = require("./algorithm/step0-burnout");
const step1_multiplier_1 = require("./algorithm/step1-multiplier");
const step2_pool_1 = require("./algorithm/step2-pool");
const step3_review_blocks_1 = require("./algorithm/step3-review-blocks");
const step4_calculate_x_1 = require("./algorithm/step4-calculate-x");
const step5_day_distribution_1 = require("./algorithm/step5-day-distribution");
const step6_priority_1 = require("./algorithm/step6-priority");
const step7_cognitive_load_1 = require("./algorithm/step7-cognitive-load");
const step7_5_place_review_1 = require("./algorithm/step7_5-place-review");
const step8_placement_1 = require("./algorithm/step8-placement");
const step9_recalculate_1 = require("./algorithm/step9-recalculate");
let PlannerService = class PlannerService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    timeToMin(t) {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }
    minToTime(min) {
        const h = Math.floor(min / 60) % 24;
        const m = min % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    mergeBusySlots(slots) {
        if (slots.length === 0)
            return [];
        const intervals = slots
            .map((s) => ({ start: this.timeToMin(s.startTime), end: this.timeToMin(s.endTime) }))
            .sort((a, b) => a.start - b.start);
        const merged = [{ ...intervals[0] }];
        for (let i = 1; i < intervals.length; i++) {
            const last = merged[merged.length - 1];
            if (intervals[i].start <= last.end) {
                last.end = Math.max(last.end, intervals[i].end);
            }
            else {
                merged.push({ ...intervals[i] });
            }
        }
        return merged;
    }
    getFreeWindows(mergedBusy) {
        const dayStart = 8 * 60;
        const dayEnd = 24 * 60;
        const free = [];
        let current = dayStart;
        for (const busy of mergedBusy) {
            if (busy.start > current) {
                free.push({ start: current, end: Math.min(busy.start, dayEnd) });
            }
            current = Math.max(current, busy.end);
        }
        if (current < dayEnd) {
            free.push({ start: current, end: dayEnd });
        }
        return free;
    }
    async createWeeklyPlan(userId) {
        const now = (0, time_util_1.getCurrentTime)();
        const weekStart = this.getWeekStart(now);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                busySlots: true,
                lessons: { include: { exams: true } },
                weeklyFeedbacks: { orderBy: { weekStart: 'desc' }, take: 1 },
                checklists: {
                    where: { date: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
                    include: { items: true },
                },
            },
        });
        if (!user)
            throw new Error('Kullanıcı bulunamadı');
        const recentChecklists = user.checklists;
        const totalPlanned = recentChecklists.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.plannedBlocks, 0), 0);
        const totalCompleted = recentChecklists.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.completedBlocks, 0), 0);
        const lastFeedback = user.weeklyFeedbacks[0] ?? null;
        const defaultMaxBlocks = user.studyStyle === 'deep_focus' ? 4
            : user.studyStyle === 'distributed' ? 2 : 3;
        const { maxBlocksPerSession } = (0, step0_burnout_1.step0Burnout)(totalCompleted, totalPlanned, defaultMaxBlocks);
        const multiplier = (0, step1_multiplier_1.step1Multiplier)(lastFeedback?.weekloadFeedback ?? null);
        const effectiveBlocks = (0, step2_pool_1.step2Pool)(multiplier);
        const weekDays = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const dayOfWeek = i + 1;
            const dayBusySlots = user.busySlots.filter((s) => s.dayOfWeek === dayOfWeek);
            return { date, dayOfWeek, busySlots: dayBusySlots };
        });
        const { reviewBlocks, reservedByLesson } = (0, step3_review_blocks_1.step3ReviewBlocks)(user.lessons, effectiveBlocks, weekStart, weekEnd);
        const allocations = (0, step4_calculate_x_1.step4CalculateX)(user.lessons, effectiveBlocks);
        const lessonAllocations = {};
        for (const alloc of allocations) {
            lessonAllocations[alloc.lessonId] = alloc.effectiveBlocks;
        }
        const dayConfigs = (0, step5_day_distribution_1.step5DayDistribution)(effectiveBlocks, weekDays, user.studyStyle, maxBlocksPerSession);
        const priorities = (0, step6_priority_1.step6Priority)(user.lessons, now);
        const lessonMap = new Map(user.lessons.map((l) => [l.id, l]));
        const slottedModeMap = new Map(priorities.map((p) => [p.lessonId, p.slottedMode]));
        const orderedWithDifficulty = priorities.map((p) => ({
            lessonId: p.lessonId,
            difficulty: lessonMap.get(p.lessonId)?.difficulty ?? 3,
            priority: p.priority,
        }));
        const cognitiveOrdered = (0, step7_cognitive_load_1.step7CognitiveLoad)(orderedWithDifficulty);
        const freeWindows = {};
        for (const day of weekDays) {
            const dateStr = day.date.toISOString().substring(0, 10);
            const mergedBusy = this.mergeBusySlots(day.busySlots.map((s) => ({ startTime: s.startTime, endTime: s.endTime })));
            freeWindows[dateStr] = this.getFreeWindows(mergedBusy);
        }
        const { placed: reviewPlaced, updatedAllocations, updatedFreeWindows } = (0, step7_5_place_review_1.step7_5PlaceReview)(reviewBlocks, freeWindows, user.preferredStudyTime, lessonAllocations);
        const { placed: lessonPlaced, notFitted } = (0, step8_placement_1.step8Placement)(cognitiveOrdered.map((l) => ({ lessonId: l.lessonId, slottedMode: slottedModeMap.get(l.lessonId) ?? false })), updatedAllocations, dayConfigs, updatedFreeWindows, user.preferredStudyTime);
        await this.prisma.scheduledBlock.deleteMany({
            where: { userId, weekStart },
        });
        const allBlocks = [...reviewPlaced, ...lessonPlaced];
        for (const block of allBlocks) {
            await this.prisma.scheduledBlock.create({
                data: {
                    userId,
                    lessonId: block.lessonId,
                    date: block.date,
                    startTime: this.minToTime(block.startMin),
                    endTime: this.minToTime(block.endMin),
                    blockCount: block.blockCount ?? Math.round((block.endMin - block.startMin) / 30),
                    isReview: block.isReview,
                    weekStart,
                },
            });
        }
        return this.getWeekBlocks(userId);
    }
    async getWeekBlocks(userId) {
        const now = (0, time_util_1.getCurrentTime)();
        const weekStart = this.getWeekStart(now);
        const blocks = await this.prisma.scheduledBlock.findMany({
            where: { userId, weekStart },
            include: { lesson: true },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });
        return { weekStart, blocks };
    }
    async recalculate(userId) {
        const now = (0, time_util_1.getCurrentTime)();
        const weekStart = this.getWeekStart(now);
        const completedItems = await this.prisma.checklistItem.findMany({
            where: {
                checklist: {
                    userId,
                    date: { gte: weekStart, lte: now },
                },
            },
        });
        const completedByLesson = {};
        for (const item of completedItems) {
            completedByLesson[item.lessonId] = (completedByLesson[item.lessonId] ?? 0) + item.completedBlocks;
        }
        const existingBlocks = await this.prisma.scheduledBlock.findMany({
            where: { userId, weekStart },
        });
        const allocatedByLesson = {};
        for (const block of existingBlocks) {
            allocatedByLesson[block.lessonId] = (allocatedByLesson[block.lessonId] ?? 0) + block.blockCount;
        }
        const remainingAllocations = (0, step9_recalculate_1.step9Recalculate)(allocatedByLesson, completedByLesson);
        for (const [lessonIdStr, remaining] of Object.entries(remainingAllocations)) {
            const lessonId = parseInt(lessonIdStr);
            if (remaining > 0) {
                await this.prisma.lesson.update({
                    where: { id: lessonId },
                    data: {
                        zorunluDelayCount: { increment: 1 },
                        zorunluMissedBlocks: { increment: remaining },
                    },
                });
            }
        }
        return this.createWeeklyPlan(userId);
    }
};
exports.PlannerService = PlannerService;
exports.PlannerService = PlannerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlannerService);
//# sourceMappingURL=planner.service.js.map