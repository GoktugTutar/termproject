import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentTime } from '../utils/time.util';
import { step0Burnout } from './algorithm/step0-burnout';
import { step1Multiplier } from './algorithm/step1-multiplier';
import { step2Pool } from './algorithm/step2-pool';
import { step3ReviewBlocks } from './algorithm/step3-review-blocks';
import { step4CalculateX } from './algorithm/step4-calculate-x';
import { step5DayDistribution } from './algorithm/step5-day-distribution';
import { step6Priority } from './algorithm/step6-priority';
import { step7CognitiveLoad } from './algorithm/step7-cognitive-load';
import { step7_5PlaceReview } from './algorithm/step7_5-place-review';
import { step8Placement } from './algorithm/step8-placement';
import { step9Recalculate } from './algorithm/step9-recalculate';

type CreateWeeklyPlanOptions = {
  fromDate?: Date;
};

@Injectable()
export class PlannerService {
  constructor(private prisma: PrismaService) {}

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private timeToMin(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  private minToTime(min: number): string {
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private toLocalDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private startOfLocalDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return this.startOfLocalDay(new Date(year, month - 1, day));
  }

  private busySlotAppliesToDate(
    slot: { dayOfWeek: number; isRoutine: boolean; date: Date | null },
    date: Date,
    dayOfWeek: number,
  ): boolean {
    if (slot.isRoutine) return slot.dayOfWeek === dayOfWeek;
    if (!slot.date) return false;
    return this.toLocalDateStr(slot.date) === this.toLocalDateStr(date);
  }

  private mergeBusySlots(
    slots: Array<{ startTime: string; endTime: string }>,
  ): Array<{ start: number; end: number }> {
    if (slots.length === 0) return [];
    const intervals = slots
      .map((s) => ({ start: this.timeToMin(s.startTime), end: this.timeToMin(s.endTime) }))
      .sort((a, b) => a.start - b.start);
    const merged = [{ ...intervals[0] }];
    for (let i = 1; i < intervals.length; i++) {
      const last = merged[merged.length - 1];
      if (intervals[i].start <= last.end) {
        last.end = Math.max(last.end, intervals[i].end);
      } else {
        merged.push({ ...intervals[i] });
      }
    }
    return merged;
  }

  private getFreeWindows(
    mergedBusy: Array<{ start: number; end: number }>,
  ): Array<{ start: number; end: number }> {
    const dayStart = 8 * 60;
    const dayEnd = 24 * 60;
    const free: Array<{ start: number; end: number }> = [];
    let current = dayStart;
    for (const busy of mergedBusy) {
      if (busy.start > current) free.push({ start: current, end: Math.min(busy.start, dayEnd) });
      current = Math.max(current, busy.end);
    }
    if (current < dayEnd) free.push({ start: current, end: dayEnd });
    return free;
  }

  async createWeeklyPlan(
    userId: number,
    forDate?: Date,
    overrideAllocations?: Record<number, number>,
    options: CreateWeeklyPlanOptions = {},
  ) {
    const now = forDate ?? getCurrentTime();
    const weekStart = this.getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        busySlots: true,
        lessons: {
          where: { term: { isActive: true } },
          include: { exams: true, deadlines: true },
        },
        weeklyFeedbacks: { orderBy: { weekStart: 'desc' }, take: 1 },
        checklists: {
          where: { date: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
          include: { items: true },
        },
      },
    });

    if (!user) throw new Error('Kullanıcı bulunamadı');

    const partialStart = options.fromDate ? this.startOfLocalDay(options.fromDate) : null;

    const recentChecklists = user.checklists;
    const totalPlanned = recentChecklists.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.plannedBlocks, 0), 0);
    const totalCompleted = recentChecklists.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.completedBlocks, 0), 0);

    const lastFeedback = user.weeklyFeedbacks[0] ?? null;

    const defaultMaxBlocks = user.studyStyle === 'deep_focus' ? 4 : user.studyStyle === 'distributed' ? 2 : 3;
    const { maxBlocksPerSession } = step0Burnout(totalCompleted, totalPlanned, defaultMaxBlocks);
    const multiplier = step1Multiplier(lastFeedback?.weekloadFeedback ?? null);
    const effectiveBlocks = step2Pool(multiplier);

    console.log(`[P] plan userId=${userId} weekStart=${weekStart.toISOString().substring(0, 10)}`);
    console.log(`[P] completion=${totalCompleted}/${totalPlanned} feedback=${lastFeedback?.weekloadFeedback ?? 'yok'} multiplier=${multiplier} effectiveBlocks=${effectiveBlocks} maxBlocks=${maxBlocksPerSession}`);
    console.log(`[P] dersler: ${user.lessons.map(l => `${l.name}(diff=${l.difficulty},nmt=${l.needsMoreTime},delay=${l.keyfiDelayCount})`).join(' | ')}`);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dayOfWeek = i + 1;
      const dayBusySlots = user.busySlots.filter((s) => this.busySlotAppliesToDate(s, date, dayOfWeek));
      return { date, dayOfWeek, busySlots: dayBusySlots };
    });
    const planningDays = partialStart
      ? weekDays.filter((day) => day.date.getTime() >= partialStart.getTime())
      : weekDays;

    // Hafta öncesi Cmt/Paz için review penceresi: weekStart − 2 gün (arkadaşın fix'i)
    const reviewWindowStart = new Date(weekStart);
    reviewWindowStart.setDate(reviewWindowStart.getDate() - 2);

    const { reviewBlocks, reservedByLesson } = step3ReviewBlocks(
      user.lessons,
      effectiveBlocks,
      weekStart,
      weekEnd,
      reviewWindowStart,
    );

    const lessonAllocations: Record<number, number> = {};
    if (overrideAllocations) {
      Object.assign(lessonAllocations, overrideAllocations);
    } else {
      const allocations = step4CalculateX(user.lessons, effectiveBlocks);
      for (const alloc of allocations) {
        lessonAllocations[alloc.lessonId] = alloc.effectiveBlocks;
      }
    }

    const dayConfigs = step5DayDistribution(planningDays, user.studyStyle, maxBlocksPerSession, user.lessons.length);

    // LessonPlanOverride'dan override'ları oku
    const overrides = await this.prisma.lessonPlanOverride.findMany({
      where: { userId, weekStart },
    });
    const priorityBoosts: Record<number, number> = {};
    const reviewBlockLessonIds = new Set<number>();
    for (const o of overrides) {
      if (o.lessonId && o.priorityBoost) {
        priorityBoosts[o.lessonId] = o.priorityBoost;
        console.log(`[P] override: lessonId=${o.lessonId} priorityBoost=+${o.priorityBoost}`);
      }
      if (o.lessonId && o.addReviewBlock) {
        reviewBlockLessonIds.add(o.lessonId);
        console.log(`[P] override: lessonId=${o.lessonId} addReviewBlock=true`);
      }
    }

    const priorities = step6Priority(user.lessons, now, priorityBoosts);
    const lessonMap = new Map(user.lessons.map((l) => [l.id, l]));
    const slottedModeMap = new Map(priorities.map((p) => [p.lessonId, p.slottedMode]));
    const orderedWithDifficulty = priorities.map((p) => ({
      lessonId: p.lessonId,
      difficulty: lessonMap.get(p.lessonId)?.difficulty ?? 3,
      priority: p.priority,
    }));
    const cognitiveOrdered = step7CognitiveLoad(orderedWithDifficulty);

    const freeWindows: Record<string, Array<{ start: number; end: number }>> = {};
    for (const day of planningDays) {
      const dateStr = this.toLocalDateStr(day.date);
      const mergedBusy = this.mergeBusySlots(day.busySlots.map((s) => ({ startTime: s.startTime, endTime: s.endTime })));
      freeWindows[dateStr] = this.getFreeWindows(mergedBusy);
    }

    // Hafta öncesi Cmt/Paz günlerini sadece review yerleştirme için freeWindows'a ekle (arkadaşın fix'i)
    const todayStart = this.startOfLocalDay(now);
    for (let offset = -2; offset < 0; offset++) {
      const preDate = new Date(weekStart);
      preDate.setDate(preDate.getDate() + offset);
      if (preDate.getTime() < todayStart.getTime()) continue;
      const dateStr = this.toLocalDateStr(preDate);
      if (freeWindows[dateStr]) continue;
      const dow = preDate.getDay() === 0 ? 7 : preDate.getDay();
      const preBusy = user.busySlots.filter((s) =>
        this.busySlotAppliesToDate(s, preDate, dow),
      );
      freeWindows[dateStr] = this.getFreeWindows(
        this.mergeBusySlots(
          preBusy.map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
        ),
      );
    }

    // addReviewBlock override'ı olan dersler için ekstra review bloğu ekle
    for (const lessonId of reviewBlockLessonIds) {
      for (const day of planningDays) {
        if (day.date < todayStart) continue;
        const dateStr = this.toLocalDateStr(day.date);
        const windows = freeWindows[dateStr] ?? [];
        const firstWindow = windows.find(w => w.end - w.start >= 30);
        if (firstWindow) {
          reviewBlocks.push({ lessonId, date: day.date, blocks: 1 });
          console.log(`[P] review blogu eklendi: lessonId=${lessonId} date=${dateStr}`);
          break;
        }
      }
    }

    const {
      placed: reviewPlaced,
      updatedAllocations,
      updatedFreeWindows,
    } = step7_5PlaceReview(
      reviewBlocks,
      freeWindows,
      user.preferredStudyTime,
      lessonAllocations,
    );

    // ADIM 8: Dersleri gün/ders sınıfı eşleşmesiyle yerleştir
    const {
      placed: lessonPlaced,
      programScore,
      programLevel,
      forcedBlocks,
      unplacedLessonIds,
      quality,
    } = step8Placement(
      cognitiveOrdered.map((l) => ({
        lessonId: l.lessonId,
        slottedMode: slottedModeMap.get(l.lessonId) ?? false,
        difficulty: l.difficulty,
        priority: l.priority,
      })),
      updatedAllocations,
      dayConfigs,
      updatedFreeWindows,
      user.preferredStudyTime,
    );

    console.log(`[P] sonuc: ${lessonPlaced.length} ders blogu + ${reviewPlaced.length} tekrar blogu | score=${programScore.toFixed(2)} level=${programLevel} forced=${forcedBlocks}`);
    if (unplacedLessonIds.length > 0) {
      const names = unplacedLessonIds.map(id => lessonMap.get(id)?.name ?? id).join(', ');
      console.warn(`[P] SIGMIYOR: ${names}`);
    }

    await this.prisma.scheduledBlock.deleteMany({
      where: partialStart
        ? { userId, weekStart, date: { gte: partialStart } }
        : { userId, weekStart },
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

    const weekBlocks = await this.getWeekBlocks(userId, now);
    return { ...weekBlocks, programScore, programLevel, forcedBlocks, unplacedLessonIds, quality };
  }

  async getWeekBlocks(userId: number, forDate?: Date) {
    const now = forDate ?? getCurrentTime();
    const weekStart = this.getWeekStart(now);
    const blocks = await this.prisma.scheduledBlock.findMany({
      where: { userId, weekStart },
      include: { lesson: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return { weekStart, blocks };
  }

  async recalculate(userId: number, fromDate?: string) {
    const now = getCurrentTime();
    const weekStart = this.getWeekStart(now);
    const todayStart = this.startOfLocalDay(now);
    const requestedStart = fromDate ? this.parseLocalDate(fromDate) : todayStart;
    const recalcStart = requestedStart.getTime() > todayStart.getTime() ? requestedStart : todayStart;

    const futureBlocks = await this.prisma.scheduledBlock.findMany({
      where: { userId, weekStart, date: { gte: recalcStart } },
    });

    const allocatedByLesson: Record<number, number> = {};
    for (const block of futureBlocks) {
      allocatedByLesson[block.lessonId] = (allocatedByLesson[block.lessonId] ?? 0) + block.blockCount;
    }

    const completedItems = await this.prisma.checklistItem.findMany({
      where: { checklist: { userId, date: { gte: weekStart, lt: recalcStart } } },
    });

    const completedByLesson: Record<number, number> = {};
    for (const item of completedItems) {
      completedByLesson[item.lessonId] = (completedByLesson[item.lessonId] ?? 0) + item.completedBlocks;
    }

    const remainingAllocations = step9Recalculate(allocatedByLesson, completedByLesson);

    console.log(`[P] recalculate userId=${userId} from=${this.toLocalDateStr(recalcStart)}`);
    console.log(`[P] allocated:`, allocatedByLesson, '| completed:', completedByLesson, '| remaining:', remainingAllocations);

    return this.createWeeklyPlan(userId, now, remainingAllocations, { fromDate: recalcStart });
  }
}