import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentTime } from '../utils/time.util';
import { BusySlotDto, SetupUserDto } from './dto/setup-user.dto';

type NormalizedBusySlot = {
  userId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  fatigueLevel: number;
  isRoutine: boolean;
  date: Date | null;
  iconKey: string;
};

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  private normalizeBusySlots(
    userId: number,
    busySlots: BusySlotDto[],
  ): NormalizedBusySlot[] {
    return busySlots.map((slot) => {
      const isRoutine = slot.isRoutine ?? slot.date == null;
      const date = isRoutine ? null : this.parseBusySlotDate(slot.date);
      return {
        userId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        fatigueLevel: slot.fatigueLevel,
        isRoutine,
        date,
        iconKey: slot.iconKey ?? 'energy',
      };
    });
  }

  private parseBusySlotDate(date?: string): Date {
    if (!date) {
      throw new BadRequestException('Tek haftalık busy time için date zorunlu.');
    }
    const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const parsed = dayOnly
      ? new Date(Date.UTC(Number(dayOnly[1]), Number(dayOnly[2]) - 1, Number(dayOnly[3])))
      : new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Busy time tarihi geçersiz.');
    }
    parsed.setUTCHours(0, 0, 0, 0);
    return parsed;
  }

  async setup(userId: number, dto: SetupUserDto) {
    const { busySlots, ...rest } = dto;
    await this.prisma.user.update({ where: { id: userId }, data: rest });
    if (busySlots !== undefined) {
      await this.prisma.userBusySlot.deleteMany({ where: { userId } });
      if (busySlots.length > 0) {
        await this.prisma.userBusySlot.createMany({
          data: this.normalizeBusySlots(userId, busySlots),
        });
      }
    }
    return this.getProfile(userId);
  }

  async updateBusySlots(userId: number, busySlots: BusySlotDto[]) {
    await this.prisma.userBusySlot.deleteMany({ where: { userId } });
    if (busySlots.length > 0) {
      await this.prisma.userBusySlot.createMany({
        data: this.normalizeBusySlots(userId, busySlots),
      });
    }
    return this.getProfile(userId);
  }

  async getProfile(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { busySlots: true },
    });
  }

  // Dijital ikiz profilini güncelle — checklist submit sonrası çağrılır
  async updateStudentProfile(userId: number): Promise<void> {
    const now = getCurrentTime();

    // Son 14 günün checklist'lerini al
    const since14 = new Date(now);
    since14.setDate(since14.getDate() - 14);
    const checklists = await this.prisma.dailyChecklist.findMany({
      where: { userId, date: { gte: since14 } },
      include: { items: true },
      orderBy: { date: 'asc' },
    });

    const lessons = await this.prisma.lesson.findMany({
      where: { userId },
      include: { exams: true },
    });

    // ── 1. Rolling 7-day completion rate ─────────────────────────────────────
    const since7 = new Date(now);
    since7.setDate(since7.getDate() - 7);
    const recent7 = checklists.filter((c) => c.date >= since7);

    let totalPlanned = 0, totalCompleted = 0;
    for (const c of recent7) {
      for (const item of c.items) {
        // Review bloğu da normal blok gibi hesaplanır —
        // haftalık tahsisten kesildiği için planın bir parçası
        totalPlanned += item.plannedBlocks;
        totalCompleted += item.completedBlocks;
      }
    }
    const completionRate7d = totalPlanned > 0 ? totalCompleted / totalPlanned : 0;

    // ── 2. Rolling 7-day avg stress ───────────────────────────────────────────
    const avgStress7d = recent7.length > 0
      ? recent7.reduce((s, c) => s + c.stressLevel, 0) / recent7.length
      : 3;

    // ── 3. Per-day-of-week completion rates (Mon=0..Sun=6) ────────────────────
    const dowPlanned = [0, 0, 0, 0, 0, 0, 0];
    const dowCompleted = [0, 0, 0, 0, 0, 0, 0];
    for (const c of checklists) {
      const dow = (new Date(c.date).getDay() + 6) % 7;
      for (const item of c.items) {
        dowPlanned[dow] += item.plannedBlocks;
        dowCompleted[dow] += item.completedBlocks;
      }
    }
    const dowCompletionRates = dowPlanned.map((p, i) =>
      p > 0 ? Math.round((dowCompleted[i] / p) * 100) / 100 : 0,
    );

    // ── 4. Session sweet spot ─────────────────────────────────────────────────
    const fullSessions: number[] = [];
    for (const c of checklists) {
      for (const item of c.items) {
        if (item.plannedBlocks > 0 && item.completedBlocks >= item.plannedBlocks) {
          fullSessions.push(item.plannedBlocks);
        }
      }
    }
    const sweetSpotBlocks = fullSessions.length > 0
      ? fullSessions.reduce((a, b) => a + b, 0) / fullSessions.length
      : 2;

    // ── 5. Avg stress near exam (<=7 days away) ───────────────────────────────
    const stressNearExamDays: number[] = [];
    for (const c of checklists) {
      const cDate = new Date(c.date);
      const nearExam = lessons.some((l) =>
        l.exams.some((e) => {
          const daysLeft = Math.ceil(
            (new Date(e.examDate).getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          return daysLeft >= 0 && daysLeft <= 7;
        }),
      );
      if (nearExam) stressNearExamDays.push(c.stressLevel);
    }
    const stressNearExam = stressNearExamDays.length > 0
      ? stressNearExamDays.reduce((a, b) => a + b, 0) / stressNearExamDays.length
      : 3;

    // ── 6. Consistency score (last 14 days) ───────────────────────────────────
    const activeDays = checklists.filter((c) =>
      c.items.some((i) => i.completedBlocks > 0),
    ).length;
    const consistencyScore = activeDays / 14;

    // ── 7. Uyku & completion ilişkisi (last 14 days, sleptWell dolu günler) ───
    const calcSleepCompletion = (days: typeof checklists): number | null => {
      const planned = days.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.plannedBlocks, 0), 0);
      const completed = days.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.completedBlocks, 0), 0);
      return planned > 0 ? completed / planned : null;
    };

    const goodSleepDays = checklists.filter((c) => c.sleptWell === true);
    const badSleepDays = checklists.filter((c) => c.sleptWell === false);
    const goodSleepCompletionRate = calcSleepCompletion(goodSleepDays);
    const badSleepCompletionRate = calcSleepCompletion(badSleepDays);

    const goodSleepAvgStress = goodSleepDays.length > 0
      ? goodSleepDays.reduce((s, c) => s + c.stressLevel, 0) / goodSleepDays.length
      : null;
    const badSleepAvgStress = badSleepDays.length > 0
      ? badSleepDays.reduce((s, c) => s + c.stressLevel, 0) / badSleepDays.length
      : null;

    if (goodSleepDays.length > 0 || badSleepDays.length > 0) {
      console.log(
        `[PROFILE] uyku etkisi: ` +
        `iyi=%${goodSleepCompletionRate !== null ? Math.round(goodSleepCompletionRate * 100) : '-'} stres=${goodSleepAvgStress?.toFixed(1) ?? '-'} (${goodSleepDays.length}g) | ` +
        `kotu=%${badSleepCompletionRate !== null ? Math.round(badSleepCompletionRate * 100) : '-'} stres=${badSleepAvgStress?.toFixed(1) ?? '-'} (${badSleepDays.length}g)`,
      );
    }

    // ── Upsert ────────────────────────────────────────────────────────────────
    await this.prisma.studentProfile.upsert({
      where: { userId },
      create: {
        userId,
        completionRate7d,
        avgStress7d,
        dowCompletionRates: JSON.stringify(dowCompletionRates),
        sweetSpotBlocks,
        stressNearExam,
        consistencyScore,
        goodSleepCompletionRate,
        badSleepCompletionRate,
        goodSleepAvgStress,
        badSleepAvgStress,
        totalSubmissions: 1,
      },
      update: {
        completionRate7d,
        avgStress7d,
        dowCompletionRates: JSON.stringify(dowCompletionRates),
        sweetSpotBlocks,
        stressNearExam,
        consistencyScore,
        goodSleepCompletionRate,
        badSleepCompletionRate,
        goodSleepAvgStress,
        badSleepAvgStress,
        totalSubmissions: { increment: 1 },
      },
    });
  }

  async endTerm(userId: number): Promise<{ ok: boolean }> {
    await this.prisma.term.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, endedAt: getCurrentTime() },
    });
    return { ok: true };
  }

  /** Aktif dönemi kapatır, yeni dönem açar ve currentTermStartedAt'i sıfırlar.
   *  Her dönem başlangıcında (onboarding + profil) çağrılır; böylece ilk hafta
   *  checklist koruması her yeni dönem için çalışır. */
  async startTerm(userId: number, name?: string): Promise<object> {
    const now = getCurrentTime();
    await this.prisma.term.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, endedAt: now },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { currentTermStartedAt: now },
    });
    return this.prisma.term.create({
      data: { userId, name: name ?? null, isActive: true },
    });
  }

  async getStudentProfile(userId: number) {
    return this.prisma.studentProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }
}