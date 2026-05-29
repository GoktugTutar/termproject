import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { getCurrentTime } from '../utils/time.util';
import { isFirstWeekDate } from '../utils/first-week.util';

@Injectable()
export class ChecklistService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  private startOfLocalDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return this.startOfLocalDay(new Date(year, month - 1, day));
  }

  private toLocalDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private nextLocalDay(date: Date): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return next;
  }

  private getWeekStart(date: Date): Date {
    const d = this.startOfLocalDay(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  private async hasChecklistForDate(userId: number, date: Date): Promise<boolean> {
    const nextDay = this.nextLocalDay(date);
    const count = await this.prisma.dailyChecklist.count({
      where: { userId, date: { gte: date, lt: nextDay } },
    });
    return count > 0;
  }

  private async adjustLessonDelayCount(lessonId: number, delta: number) {
    if (delta === 0) return;
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { keyfiDelayCount: true },
    });
    if (!lesson) return;
    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { keyfiDelayCount: Math.max(0, lesson.keyfiDelayCount + delta) },
    });
  }

  // ── Sabah uyku sorusu ────────────────────────────────────────────────────

  /** Bugün sleptWell dolu mu? (sabah card gösterilecek mi?) */
  async getSleepStatus(
    userId: number,
  ): Promise<{ asked: boolean; date: string; sleptWell: boolean | null }> {
    const today = this.startOfLocalDay(getCurrentTime());
    const tomorrow = this.nextLocalDay(today);

    const checklist = await this.prisma.dailyChecklist.findFirst({
      where: {
        userId,
        date: { gte: today, lt: tomorrow },
        sleptWell: { not: null },
      },
      select: { sleptWell: true },
      orderBy: { id: 'desc' },
    });

    return {
      asked: checklist?.sleptWell !== null && checklist?.sleptWell !== undefined,
      date: this.toLocalDateStr(today),
      sleptWell: checklist?.sleptWell ?? null,
    };
  }

  /** Sabah: sadece uyku cevabını kaydet, checklist yoksa oluştur */
  async submitSleep(
    userId: number,
    sleptWell: boolean,
  ): Promise<{ asked: boolean; date: string; sleptWell: boolean }> {
    const today = this.startOfLocalDay(getCurrentTime());
    const tomorrow = this.nextLocalDay(today);

    const existingCount = await this.prisma.dailyChecklist.count({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });

    if (existingCount > 0) {
      await this.prisma.dailyChecklist.updateMany({
        where: { userId, date: { gte: today, lt: tomorrow } },
        data: { sleptWell },
      });
    } else {
      await this.prisma.dailyChecklist.create({
        data: { userId, date: today, stressLevel: 3, sleptWell },
      });
    }

    console.log(`[SLEEP] userId=${userId} date=${this.toLocalDateStr(today)} sleptWell=${sleptWell}`);
    return { asked: true, date: this.toLocalDateStr(today), sleptWell };
  }

  // ── Günlük checklist ─────────────────────────────────────────────────────

  async submit(userId: number, dto: SubmitChecklistDto) {
    const today = dto.date
      ? this.parseLocalDate(dto.date)
      : this.startOfLocalDay(getCurrentTime());
    const tomorrow = this.nextLocalDay(today);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentTermStartedAt: true },
    });
    if (isFirstWeekDate(user?.currentTermStartedAt, today)) {
      throw new BadRequestException('İlk hafta checklist kapalı.');
    }

    let checklist = await this.prisma.dailyChecklist.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
      include: { items: true },
    });

    if (!checklist) {
      checklist = await this.prisma.dailyChecklist.create({
        data: { userId, date: today, stressLevel: dto.stressLevel },
        include: { items: true },
      });
    } else {
      await this.prisma.dailyChecklist.update({
        where: { id: checklist.id },
        data: { stressLevel: dto.stressLevel },
      });
    }

    await Promise.all(
      dto.items.map(async (item) => {
        const existing = await this.prisma.checklistItem.findFirst({
          where: { checklistId: checklist.id, lessonId: item.lessonId },
        });

        const delayed = item.completedBlocks < item.plannedBlocks;
        // Review bloğu için delay sayacını değiştirme
        const delayDelta = (item.isReview)
          ? 0
          : existing
            ? delayed === existing.delayed ? 0 : delayed ? 1 : -1
            : delayed ? 1 : 0;

        if (existing) {
          await this.prisma.checklistItem.update({
            where: { id: existing.id },
            data: {
              plannedBlocks: item.plannedBlocks,
              completedBlocks: item.completedBlocks,
              delayed,
              isReview: item.isReview ?? false,
            },
          });
        } else {
          await this.prisma.checklistItem.create({
            data: {
              checklistId: checklist.id,
              lessonId: item.lessonId,
              plannedBlocks: item.plannedBlocks,
              completedBlocks: item.completedBlocks,
              delayed,
              isReview: item.isReview ?? false,
            },
          });
        }

        await this.adjustLessonDelayCount(item.lessonId, delayDelta);
      }),
    );

    this.userService.updateStudentProfile(userId).catch(() => {});
    return this.getByDate(userId, this.toLocalDateStr(today));
  }

  async getHistory(userId: number, days: number) {
    const today = this.startOfLocalDay(getCurrentTime());
    const result: { date: string; hasBlocks: boolean; hasChecklist: boolean }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const nextDay = this.nextLocalDay(d);

      const [blockCount, checklistCount] = await Promise.all([
        this.prisma.scheduledBlock.count({ where: { userId, date: { gte: d, lt: nextDay } } }),
        this.prisma.dailyChecklist.count({ where: { userId, date: { gte: d, lt: nextDay } } }),
      ]);

      result.push({ date: this.toLocalDateStr(d), hasBlocks: blockCount > 0, hasChecklist: checklistCount > 0 });
    }

    return result;
  }

  async getByDate(userId: number, dateStr: string) {
    const date = this.parseLocalDate(dateStr);
    const nextDay = this.nextLocalDay(date);
    return this.prisma.dailyChecklist.findFirst({
      where: { userId, date: { gte: date, lt: nextDay } },
      include: { items: true },
    });
  }

  private async hasScheduledBlocksForDate(userId: number, date: Date): Promise<boolean> {
    const nextDay = this.nextLocalDay(date);
    const count = await this.prisma.scheduledBlock.count({
      where: { userId, date: { gte: date, lt: nextDay } },
    });
    return count > 0;
  }

  async getStatus(userId: number, dateStr: string) {
    const date = this.parseLocalDate(dateStr);
    const weekStart = this.getWeekStart(date);
    const tomorrow = this.nextLocalDay(date);

    // Kullanıcıyı çek
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentTermStartedAt: true },
    });

    if (isFirstWeekDate(user?.currentTermStartedAt, date)) {
      return {
        date: this.toLocalDateStr(date),
        blocked: false,
        missingDates: [],
        checklist: null,
        checklistDisabled: true,
        disabledReason: 'first_week',
        message: 'İlk hafta adaptasyon haftası. Programın hazır; bu hafta checklist sunulmayacak.',
      };
    }

    // Haftalık blok ve checklist verilerini iki sorguda çek (N+1 yerine)
    const [weekBlocks, weekChecklists] = await Promise.all([
      this.prisma.scheduledBlock.findMany({
        where: { userId, weekStart, date: { lt: date } },
        select: { date: true },
      }),
      this.prisma.dailyChecklist.findMany({
        where: { userId, date: { gte: weekStart, lt: tomorrow } },
        include: { items: true },
      }),
    ]);

    // Tarih → varlık map'i oluştur (bellekte karşılaştırma)
    const datesWithBlocks = new Set(weekBlocks.map(b => this.toLocalDateStr(b.date)));
    const checklistByDate = new Map(weekChecklists.map(c => [this.toLocalDateStr(c.date), c]));

    // Pazartesi'den bugüne eksik checklistleri bul
    const missingDates: string[] = [];
    for (let cursor = new Date(weekStart); cursor < date; cursor = this.nextLocalDay(cursor)) {
      const key = this.toLocalDateStr(cursor);
      if (datesWithBlocks.has(key) && !checklistByDate.has(key)) {
        missingDates.push(key);
      }
    }

    return {
      date: this.toLocalDateStr(date),
      blocked: missingDates.length > 0,
      missingDates,
      checklist: checklistByDate.get(this.toLocalDateStr(date)) ?? null,
      checklistDisabled: false,
    };
  }
}
