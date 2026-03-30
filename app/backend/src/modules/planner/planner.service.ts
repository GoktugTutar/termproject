import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleEntity } from './schedule.entity.js';
import { HeuristicService, HeuristicResult } from '../heuristic/heuristic.service.js';
import { LessonService } from '../lesson/lesson.service.js';
import { UserService } from '../user/user.service.js';
import { ChecklistService } from '../checklist/checklist.service.js';
import { BusyTimeMap } from '../user/user.model.js';
import { isMonday, formatTimeRange } from '../../common/utils/date.utils.js';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WORK_START = 8;
const WORK_END = 22; // 14 available hours per day
const MAX_HOURS_PER_LESSON_PER_DAY = 3;

@Injectable()
export class PlannerService {
  constructor(
    @InjectRepository(ScheduleEntity)
    private readonly scheduleRepo: Repository<ScheduleEntity>,
    private readonly heuristicService: HeuristicService,
    private readonly lessonService: LessonService,
    private readonly userService: UserService,
    private readonly checklistService: ChecklistService,
  ) {}

  /**
   * POST /planner/create
   * Called at end of day. Recalculates the weekly schedule:
   *  1. Ranks lessons by H score.
   *  2. Distributes X hours per lesson across the week respecting busy times.
   *  3. Removes future slots for lessons finished early.
   */
  async create(userId: string): Promise<ScheduleEntity | null> {
    const [user, lessons, weekChecklists, earlyIds] = await Promise.all([
      this.userService.findById(userId),
      this.lessonService.findByUserId(userId),
      this.checklistService.getWeekChecklists(userId),
      this.checklistService.getEarlyCompletedIds(userId),
    ]);

    if (!user) return null;

    const firstDay = isMonday();
    const ranked = this.heuristicService.rankLessons(lessons, user, weekChecklists, firstDay);

    // Only schedule lessons not yet fully completed early
    const activeLessons = ranked.filter((r) => !earlyIds.includes(r.lessonId));

    const schedule = this.buildWeeklySchedule(activeLessons, user.busyTimes ?? {});

    // Persist: upsert schedule for the current week
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

  /**
   * GET /planner/schedule
   * Returns the most recent schedule for the user.
   */
  async getSchedule(userId: string): Promise<ScheduleEntity | null> {
    return this.scheduleRepo.findOne({
      where: { userId },
      order: { startDate: 'DESC' },
    });
  }

  // ---------------------------------------------------------------------------

  private buildWeeklySchedule(
    ranked: HeuristicResult[],
    busyTimes: BusyTimeMap,
  ): Record<string, Record<string, string>> {
    // remaining weekly hours per lesson
    const remaining = new Map(ranked.map((r) => [r.lessonId, Math.max(1, Math.ceil(r.X))]));

    const schedule: Record<string, Record<string, string>> = {};

    for (const day of DAYS) {
      schedule[day] = {};

      // Embed busy times in schedule
      const busyDay = busyTimes[day] ?? {};
      for (const [range, label] of Object.entries(busyDay)) {
        schedule[day][range] = `busy:${label}`;
      }

      // Collect free hours (sorted)
      const busyHours = this.expandBusyHours(busyDay);
      const freeHours: number[] = [];
      for (let h = WORK_START; h < WORK_END; h++) {
        if (!busyHours.has(h)) freeHours.push(h);
      }

      let slotPtr = 0;

      for (const { lessonId } of ranked) {
        const rem = remaining.get(lessonId) ?? 0;
        if (rem <= 0 || slotPtr >= freeHours.length) continue;

        const todayHours = Math.min(rem, MAX_HOURS_PER_LESSON_PER_DAY);
        const available = freeHours.length - slotPtr;
        const assign = Math.min(todayHours, available);

        if (assign > 0) {
          const start = freeHours[slotPtr];
          const end = freeHours[slotPtr + assign - 1] + 1;
          schedule[day][formatTimeRange(start, end)] = lessonId;
          remaining.set(lessonId, rem - assign);
          slotPtr += assign;
        }
      }
    }

    return schedule;
  }

  private expandBusyHours(busyDay: Record<string, string>): Set<number> {
    const hours = new Set<number>();
    for (const range of Object.keys(busyDay)) {
      const [s, e] = range.split('-').map(Number);
      for (let h = s; h < e; h++) hours.add(h);
    }
    return hours;
  }

  private currentWeekRange(): { startDate: string; endDate: string } {
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
}
