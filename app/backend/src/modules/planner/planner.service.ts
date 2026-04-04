import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleEntity } from './schedule.entity.js';
import { HeuristicService, HeuristicResult } from '../heuristic/heuristic.service.js';
import { LessonService } from '../lesson/lesson.service.js';
import { UserService } from '../user/user.service.js';
import { ChecklistService } from '../checklist/checklist.service.js';
import type { BusyTimeMap } from '../user/user.model.js';
import { getDayName, formatTimeRange, todayString } from '../../common/utils/date.utils.js';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WORK_START = 8;
const WORK_END = 22;
const MAX_HOURS_PER_LESSON_PER_DAY = 3;
const MAX_LESSON_BLOCKS_FREE_DAY = 3;
const MAX_LESSON_BLOCKS_BUSY_DAY = 2;

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
   *
   * İki senaryo:
   *
   * 1) Bu hafta için schedule YOK → tam hafta oluştur (haftanın ilk çağrısı)
   *    - Checklist geçmişi olmadığı için R = X (hepsi yapılmamış sayılır)
   *    - Tüm günler (pazartesi→pazar) doldurulur
   *
   * 2) Bu hafta için schedule VAR → sadece kalan günleri güncelle (gün sonu çağrısı)
   *    - Bugün ve önceki günler olduğu gibi korunur
   *    - Erken biten dersler kalan günlerden kaldırılır
   *    - Kalan dersler R skoruna göre yeniden sıralanıp kalan günlere dağıtılır
   */
  async create(userId: string): Promise<ScheduleEntity | null> {
    const { startDate, endDate } = this.currentWeekRange();
    const today = todayString();
    const dayName = getDayName();

    // Bu hafta için schedule var mı? → senaryo belirleme
    const existing = await this.scheduleRepo.findOne({ where: { userId, startDate } });

    // ── Aynı gün tekrar çağrıldıysa hesaplama yapma, mevcut programı döndür ──
    if (existing?.lastUpdatedDate === today) {
      return existing;
    }

    // ── Pzt–Cmt: bugünün checklistini doldurmadan program güncellenemesin ─────
    // (sadece güncelleme senaryosunda — ilk oluşturmada checklist henüz yok)
    if (existing && dayName !== 'sunday') {
      const submitted = await this.checklistService.isTodaySubmitted(userId);
      if (!submitted) {
        throw new BadRequestException(
          'Programı güncellemek için önce bugünün checklistini doldurmanız gerekiyor.',
        );
      }
    }

    const [user, lessons, weekChecklists, earlyIds] = await Promise.all([
      this.userService.findById(userId),
      this.lessonService.findByUserId(userId),
      this.checklistService.getWeekChecklists(userId),
      this.checklistService.getEarlyCompletedIds(userId),
    ]);

    if (!user) return null;

    // isFirstCall: bu hafta henüz schedule oluşturulmamış (Pazar akşamı ilk çağrı)
    const isFirstCall = !existing;

    const ranked = this.heuristicService.rankLessons(
      lessons,
      user,
      weekChecklists,
      isFirstCall, // true → R = X (checklist yok), false → R = X - tamamlanan
    );

    // Erken biten dersleri çıkar
    const activeLessons = ranked.filter((r) => !earlyIds.includes(r.lessonId));

    // ── SENARYO 1: Pazar akşamı → gelecek hafta için tam program ──────────────
    if (isFirstCall) {
      const schedule = this.buildFullWeek(activeLessons, user.busyTimes ?? {});
      const entity = this.scheduleRepo.create({
        userId, startDate, endDate, schedule, lastUpdatedDate: today,
      });
      return this.scheduleRepo.save(entity);
    }

    // ── SENARYO 2: Gün sonu (Pzt–Cmt) → sadece kalan günleri güncelle ─────────
    existing.schedule = this.updateFutureDays(
      existing.schedule,
      activeLessons,
      user.busyTimes ?? {},
    );
    existing.lastUpdatedDate = today;
    return this.scheduleRepo.save(existing);
  }

  /**
   * GET /planner/schedule
   * Bu hafta için schedule var mı kontrol eder.
   * - Varsa  → direkt döndürür
   * - Yoksa  → 404 fırlatır (önce checklist doldurulmalı)
   */
  async getSchedule(userId: string): Promise<ScheduleEntity> {
    const { startDate } = this.currentWeekRange();
    const schedule = await this.scheduleRepo.findOne({ where: { userId, startDate } });

    if (!schedule) {
      throw new NotFoundException(
        'Bu hafta için program bulunamadı. Lütfen önce günlük checklistinizi doldurun.',
      );
    }

    return schedule;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Tüm haftayı sıfırdan oluşturur (pazartesi → pazar).
   * Her ders için haftalık X saati günlere dağıtır.
   */
  private buildFullWeek(
    ranked: HeuristicResult[],
    busyTimes: BusyTimeMap,
  ): Record<string, Record<string, string>> {
    // X: her ders için bu hafta verilecek toplam saat
    const remaining = new Map(
      ranked.map((r) => [r.lessonId, Math.max(1, Math.ceil(r.X))]),
    );
    return this.fillDays(DAYS, ranked, remaining, busyTimes);
  }

  /**
   * Bugünü ve geçmiş günleri korur, yarından itibaren kalan günleri yeniden doldurur.
   * Her ders için R (kalan saat) kullanılır — tamamlanan saatler düşülmüş olur.
   */
  private updateFutureDays(
    existingSchedule: Record<string, Record<string, string>>,
    ranked: HeuristicResult[],
    busyTimes: BusyTimeMap,
  ): Record<string, Record<string, string>> {
    const todayIndex = DAYS.indexOf(getDayName());

    // Bugün ve önceki günleri olduğu gibi taşı
    const newSchedule: Record<string, Record<string, string>> = {};
    for (let i = 0; i <= todayIndex; i++) {
      newSchedule[DAYS[i]] = existingSchedule[DAYS[i]] ?? {};
    }

    // Kalan günler için: R saatini kullan (checklist'ten düşülmüş gerçek kalan)
    const futureDays = DAYS.slice(todayIndex + 1);

    if (futureDays.length === 0) return newSchedule; // hafta bitti

    const remaining = new Map(
      ranked.map((r) => [r.lessonId, Math.max(0, Math.ceil(r.R))]),
    );

    const filledFuture = this.fillDays(futureDays, ranked, remaining, busyTimes);
    for (const day of futureDays) {
      newSchedule[day] = filledFuture[day];
    }

    return newSchedule;
  }

  /**
   * Verilen günleri H sıralamasına göre derslerle doldurur.
   * Her ders için kalan saat `remaining` map'inden okunur.
   */
  private fillDays(
    days: string[],
    ranked: HeuristicResult[],
    remaining: Map<string, number>,
    busyTimes: BusyTimeMap,
  ): Record<string, Record<string, string>> {
    const schedule: Record<string, Record<string, string>> = {};

    for (const day of days) {
      schedule[day] = {};

      const busyDay = busyTimes[day] ?? {};
      const busyEntries = this.normalizeBusyEntries(busyDay);

      // Meşgul saatleri programa göm
      for (const busyEntry of busyEntries) {
        schedule[day][formatTimeRange(busyEntry.start, busyEntry.end)] =
          `busy:${busyEntry.label}`;
      }

      const freeRanges = this.buildFreeRanges(busyEntries);
      const maxLessonBlocks = busyEntries.length > 0
        ? MAX_LESSON_BLOCKS_BUSY_DAY
        : MAX_LESSON_BLOCKS_FREE_DAY;
      let freeRangeIndex = 0;
      let lessonBlocksPlaced = 0;

      // H sıralamasına göre (en öncelikliden başla) dersleri yerleştir
      for (const { lessonId } of ranked) {
        if (
          freeRangeIndex >= freeRanges.length ||
          lessonBlocksPlaced >= maxLessonBlocks
        ) {
          break;
        }

        const rem = remaining.get(lessonId) ?? 0;
        if (rem <= 0) continue;

        const currentRange = freeRanges[freeRangeIndex];
        const availableHours = currentRange.end - currentRange.start;
        if (availableHours <= 0) {
          freeRangeIndex++;
          continue;
        }

        const assign = Math.min(
          rem,
          MAX_HOURS_PER_LESSON_PER_DAY,
          availableHours,
        );
        if (assign <= 0) continue;

        const start = currentRange.start;
        const end = start + assign;
        schedule[day][formatTimeRange(start, end)] = lessonId;
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

  private normalizeBusyEntries(
    busyDay: Record<string, string>,
  ): Array<{ start: number; end: number; label: string }> {
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

  private buildFreeRanges(
    busyEntries: Array<{ start: number; end: number }>,
  ): Array<{ start: number; end: number }> {
    const busyHours = this.expandBusyHours(busyEntries);
    const ranges: Array<{ start: number; end: number }> = [];

    let rangeStart: number | null = null;
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

  private expandBusyHours(
    busyEntries: Array<{ start: number; end: number }>,
  ): Set<number> {
    const hours = new Set<number>();
    for (const entry of busyEntries) {
      for (let h = entry.start; h < entry.end; h++) hours.add(h);
    }
    return hours;
  }

  private currentWeekRange(): { startDate: string; endDate: string } {
    const now = new Date();
    const day = now.getDay();

    // Pazar (0) → gelecek haftanın Pazartesi'si (+1)
    // Pazartesi–Cumartesi → bu haftanın Pazartesi'si
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
}
