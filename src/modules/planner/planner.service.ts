import {
  BadRequestException, forwardRef, Inject, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HeuristicService } from '../heuristic/heuristic.service';
import { LessonService } from '../lesson/lesson.service';
import { UserService } from '../user/user.service';
import { ChecklistService } from '../checklist/checklist.service';
import {
  getDayName, todayString, formatTimeRange, parseTimeRange,
  addDaysToDateString, dateDiffInDays, formatDateKey, hourToTimeDate, dateStringToDate, prismaDateToString,
} from '../../common/utils/date.utils';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WORK_START = 8;
const WORK_END = 22;
const MAX_HOURS_PER_LESSON_PER_DAY = 3;
const MAX_LESSON_BLOCKS_FREE_DAY = 3;
const MAX_LESSON_BLOCKS_BUSY_DAY = 2;

type DaySchedule = Record<string, string>; // "startH-endH" → lessonId
type WeekSchedule = Record<string, DaySchedule>;
type BusyTimeMap = Record<string, Record<string, string>>;

@Injectable()
export class PlannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly heuristicService: HeuristicService,
    private readonly lessonService: LessonService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => ChecklistService))
    private readonly checklistService: ChecklistService,
  ) {}

  /** Called after checklist submit — handles both create (Sunday) and update (weekdays) */
  async createOrUpdate(userId: string) {
    return this.create(userId);
  }

  async create(userId: string) {
    const { startDate, endDate } = this.currentWeekRange();
    const today = todayString();
    const dayName = getDayName();

    const [user, existing] = await Promise.all([
      this.userService.findById(userId),
      this.loadScheduleForWeek(userId, dateStringToDate(startDate)),
    ]);
    if (!user) return null;

    const busyTimes = this.userService.getBusyTimeMap(user);

    // Return cached if already updated today
    if (existing && prismaDateToString(existing.schedule.updatedAt) === today) {
      return this.serializeSchedule(existing.schedule, existing.blocks, busyTimes);
    }

    // Mid-week: require today's checklist to be submitted before updating
    if (existing && dayName !== 'sunday') {
      const submitted = await this.checklistService.isTodaySubmitted(userId);
      if (!submitted) {
        throw new BadRequestException('Programı güncellemek için önce bugünün checklistini doldurmanız gerekiyor.');
      }
    }

    const isFirstCall = !existing;
    const [lessons, weekChecklists, earlyIds, stressLevel] = await Promise.all([
      this.lessonService.findEntitiesByUserId(userId),
      this.checklistService.getWeekChecklists(userId),
      this.checklistService.getEarlyCompletedIds(userId),
      this.checklistService.getLatestStressLevel(userId),
    ]);

    const ranked = this.heuristicService.rankLessons(lessons, stressLevel, weekChecklists, isFirstCall);
    // Remove lessons already completed early this week
    const activeLessons = ranked.filter((r) => !earlyIds.includes(r.lessonId));

    // CASE 1: First ever call — create full week
    if (isFirstCall) {
      const studySchedule = this.buildFullWeek(activeLessons, busyTimes);
      const savedSchedule = await this.prisma.weeklySchedule.create({
        data: {
          userId,
          weekStartDate: dateStringToDate(startDate),
          weekEndDate: dateStringToDate(endDate),
          totalAvailableHours: this.calculateTotalAvailableHours(busyTimes),
          totalPlannedHours: this.calculateTotalPlannedHours(studySchedule),
          version: 1,
          status: 'active',
        },
      });
      await this.insertScheduleBlocks(savedSchedule.id, startDate, studySchedule);
      const loaded = await this.loadScheduleById(savedSchedule.id);
      if (!loaded) return null;
      return this.serializeSchedule(loaded.schedule, loaded.blocks, busyTimes);
    }

    // CASE 2: Sunday — rebuild full week (next week)
    if (dayName === 'sunday') {
      const studySchedule = this.buildFullWeek(activeLessons, busyTimes);
      await this.prisma.weeklySchedule.update({
        where: { id: existing.schedule.id },
        data: {
          totalAvailableHours: this.calculateTotalAvailableHours(busyTimes),
          totalPlannedHours: this.calculateTotalPlannedHours(studySchedule),
          status: 'active',
          version: { increment: 1 },
        },
      });
      await this.prisma.scheduleBlock.deleteMany({ where: { weeklyScheduleId: existing.schedule.id } });
      await this.insertScheduleBlocks(existing.schedule.id, startDate, studySchedule);
      const loaded = await this.loadScheduleById(existing.schedule.id);
      if (!loaded) return null;
      return this.serializeSchedule(loaded.schedule, loaded.blocks, busyTimes);
    }

    // CASE 3: Mid-week — keep past days, rebuild future days
    const todayDate = dateStringToDate(today);
    await this.prisma.scheduleBlock.deleteMany({
      where: {
        weeklyScheduleId: existing.schedule.id,
        blockDate: { gt: todayDate },
      },
    });

    const futureDays = DAYS.slice(DAYS.indexOf(dayName) + 1);
    const futureSchedule = this.buildDays(futureDays, activeLessons, busyTimes);

    await this.prisma.weeklySchedule.update({
      where: { id: existing.schedule.id },
      data: {
        totalPlannedHours: this.calculateTotalPlannedHours(futureSchedule),
        status: 'active',
        version: { increment: 1 },
      },
    });

    await this.insertScheduleBlocks(existing.schedule.id, startDate, futureSchedule);

    const loaded = await this.loadScheduleById(existing.schedule.id);
    if (!loaded) return null;
    return this.serializeSchedule(loaded.schedule, loaded.blocks, busyTimes);
  }

  async getSchedule(userId: string) {
    const { startDate } = this.currentWeekRange();
    const [user, loaded] = await Promise.all([
      this.userService.findById(userId),
      this.loadScheduleForWeek(userId, dateStringToDate(startDate)),
    ]);
    if (!user || !loaded) {
      throw new NotFoundException('Bu hafta için program bulunamadı.');
    }
    return this.serializeSchedule(loaded.schedule, loaded.blocks, this.userService.getBusyTimeMap(user));
  }

  // ─── Schedule loading ────────────────────────────────────────────────────────

  private async loadScheduleForWeek(userId: string, weekStartDate: Date) {
    const schedule = await this.prisma.weeklySchedule.findFirst({
      where: { userId, weekStartDate },
    });
    if (!schedule) return null;
    const blocks = await this.prisma.scheduleBlock.findMany({
      where: { weeklyScheduleId: schedule.id },
      orderBy: [{ blockDate: 'asc' }, { startTime: 'asc' }],
    });
    return { schedule, blocks };
  }

  private async loadScheduleById(id: string) {
    const schedule = await this.prisma.weeklySchedule.findUnique({ where: { id } });
    if (!schedule) return null;
    const blocks = await this.prisma.scheduleBlock.findMany({
      where: { weeklyScheduleId: id },
      orderBy: [{ blockDate: 'asc' }, { startTime: 'asc' }],
    });
    return { schedule, blocks };
  }

  // ─── Serialization ───────────────────────────────────────────────────────────

  private serializeSchedule(schedule: any, blocks: any[], busyTimes: BusyTimeMap) {
    const scheduleMap: WeekSchedule = Object.fromEntries(DAYS.map((d) => [d, {}]));

    // Fill busy slots
    for (const day of DAYS) {
      for (const [range, reason] of Object.entries(busyTimes[day] ?? {})) {
        scheduleMap[day][range] = `busy:${reason}`;
      }
    }

    // Fill lesson blocks
    const weekStart = prismaDateToString(schedule.weekStartDate);
    for (const block of blocks) {
      if (!block.lessonId) continue;
      const dayKey = this.getDayKeyForDate(prismaDateToString(block.blockDate), weekStart);
      if (!dayKey) continue;
      const startH = this.timeToHour(block.startTime);
      const endH = this.timeToHour(block.endTime);
      scheduleMap[dayKey][formatTimeRange(startH, endH)] = block.lessonId;
    }

    return {
      id: schedule.id,
      userId: schedule.userId,
      startDate: prismaDateToString(schedule.weekStartDate),
      endDate: prismaDateToString(schedule.weekEndDate),
      schedule: scheduleMap,
      lastUpdatedDate: schedule.updatedAt.toISOString(),
      totalAvailableHours: schedule.totalAvailableHours,
      totalPlannedHours: schedule.totalPlannedHours,
      version: schedule.version,
      status: schedule.status,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }

  // ─── Schedule building ───────────────────────────────────────────────────────

  private buildFullWeek(ranked: any[], busyTimes: BusyTimeMap): WeekSchedule {
    return this.buildDays(DAYS, ranked, busyTimes);
  }

  private buildDays(days: string[], ranked: any[], busyTimes: BusyTimeMap): WeekSchedule {
    const remaining = new Map(ranked.map((r) => [r.lessonId, Math.max(1, Math.ceil(r.X))]));
    const schedule: WeekSchedule = {};

    for (const day of days) {
      schedule[day] = {};
      const busyEntries = this.normalizeBusyEntries(busyTimes[day] ?? {});
      const freeRanges = this.buildFreeRanges(busyEntries);
      const maxBlocks = busyEntries.length > 0 ? MAX_LESSON_BLOCKS_BUSY_DAY : MAX_LESSON_BLOCKS_FREE_DAY;

      let freeIdx = 0;
      let blocksPlaced = 0;

      for (const { lessonId } of ranked) {
        if (freeIdx >= freeRanges.length || blocksPlaced >= maxBlocks) break;
        const rem = remaining.get(lessonId) ?? 0;
        if (rem <= 0) continue;

        const range = freeRanges[freeIdx];
        const available = range.end - range.start;
        if (available <= 0) { freeIdx++; continue; }

        const assign = Math.min(rem, MAX_HOURS_PER_LESSON_PER_DAY, available);
        if (assign <= 0) continue;

        schedule[day][formatTimeRange(range.start, range.start + assign)] = lessonId;
        remaining.set(lessonId, rem - assign);
        range.start += assign;
        blocksPlaced++;
        if (range.start >= range.end) freeIdx++;
      }
    }
    return schedule;
  }

  // ─── DB block helpers ────────────────────────────────────────────────────────

  private async insertScheduleBlocks(weeklyScheduleId: string, weekStart: string, schedule: WeekSchedule) {
    const data = DAYS.flatMap((day, idx) =>
      Object.entries(schedule[day] ?? {})
        .sort(([a], [b]) => parseTimeRange(a).start - parseTimeRange(b).start)
        .map(([range, lessonId]) => {
          const { start, end } = parseTimeRange(range);
          return {
            weeklyScheduleId,
            lessonId,
            blockDate: dateStringToDate(addDaysToDateString(weekStart, idx)),
            startTime: hourToTimeDate(start),
            endTime: hourToTimeDate(end),
            plannedHours: end - start,
          };
        }),
    );
    if (data.length > 0) {
      await this.prisma.scheduleBlock.createMany({ data });
    }
  }

  // ─── Busy/free time helpers ──────────────────────────────────────────────────

  private normalizeBusyEntries(busyDay: Record<string, string>) {
    return Object.entries(busyDay)
      .map(([range]) => {
        const { start, end } = parseTimeRange(range);
        return { start: Math.max(WORK_START, start), end: Math.min(WORK_END, end) };
      })
      .filter((e) => e.end > e.start)
      .sort((a, b) => a.start - b.start);
  }

  private buildFreeRanges(busy: { start: number; end: number }[]) {
    const busyHours = new Set<number>();
    for (const { start, end } of busy) {
      for (let h = start; h < end; h++) busyHours.add(h);
    }
    const ranges: { start: number; end: number }[] = [];
    let rangeStart: number | null = null;
    for (let h = WORK_START; h < WORK_END; h++) {
      if (!busyHours.has(h)) {
        if (rangeStart === null) rangeStart = h;
      } else if (rangeStart !== null) {
        ranges.push({ start: rangeStart, end: h });
        rangeStart = null;
      }
    }
    if (rangeStart !== null) ranges.push({ start: rangeStart, end: WORK_END });
    return ranges;
  }

  private calculateTotalAvailableHours(busyTimes: BusyTimeMap): number {
    return DAYS.reduce((sum, day) => {
      const busy = this.normalizeBusyEntries(busyTimes[day] ?? {});
      return sum + this.buildFreeRanges(busy).reduce((s, r) => s + (r.end - r.start), 0);
    }, 0);
  }

  private calculateTotalPlannedHours(schedule: WeekSchedule): number {
    return Object.values(schedule).reduce(
      (sum, day) =>
        sum +
        Object.keys(day).reduce((s, range) => {
          const { start, end } = parseTimeRange(range);
          return s + Math.max(0, end - start);
        }, 0),
      0,
    );
  }

  // ─── Date helpers ────────────────────────────────────────────────────────────

  private getDayKeyForDate(blockDate: string, weekStart: string): string | null {
    const diff = dateDiffInDays(weekStart, blockDate);
    return diff >= 0 && diff < DAYS.length ? DAYS[diff] : null;
  }

  private timeToHour(value: Date | string): number {
    if (typeof value === 'string') return Number(value.split(':')[0]);
    return value.getUTCHours();
  }

  /** On Sunday → returns upcoming Mon-Sun; otherwise current Mon-Sun */
  private currentWeekRange(): { startDate: string; endDate: string } {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diffToMon = day === 0 ? 1 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);
    const startDate = formatDateKey(monday);
    return { startDate, endDate: addDaysToDateString(startDate, 6) };
  }
}
