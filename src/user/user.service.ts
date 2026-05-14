import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentTime } from '../utils/time.util';
import { SetupUserDto } from './dto/setup-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // Kullanıcı tercihlerini kaydet/güncelle
  async setup(userId: number, dto: SetupUserDto) {
    const { busySlots, ...rest } = dto;

    await this.prisma.user.update({
      where: { id: userId },
      data: rest,
    });

    if (busySlots !== undefined) {
      // Mevcut busy slotları sil ve yenilerini ekle
      await this.prisma.userBusySlot.deleteMany({ where: { userId } });
      if (busySlots.length > 0) {
        await this.prisma.userBusySlot.createMany({
          data: busySlots.map((s) => ({ ...s, userId })),
        });
      }
    }

    return this.getProfile(userId);
  }

  // BusySlot'ları tamamen güncelle (eski slotları sil, yenilerini ekle)
  async updateBusySlots(userId: number, busySlots: any[]) {
    await this.prisma.userBusySlot.deleteMany({ where: { userId } });
    if (busySlots.length > 0) {
      await this.prisma.userBusySlot.createMany({
        data: busySlots.map((s) => ({ ...s, userId })),
      });
    }
    return this.getProfile(userId);
  }

  // Kullanıcı profili ve busy slotları getir
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

    // Sınav tarihli dersleri al
    const lessons = await this.prisma.lesson.findMany({
      where: { userId },
      include: { exams: true },
    });

    // ── 1. Rolling 7-day completion rate ──────────────────────────────────────
    const since7 = new Date(now);
    since7.setDate(since7.getDate() - 7);
    const recent7 = checklists.filter((c) => c.date >= since7);

    let totalPlanned = 0, totalCompleted = 0;
    for (const c of recent7) {
      for (const item of c.items) {
        totalPlanned += item.plannedBlocks;
        totalCompleted += item.completedBlocks;
      }
    }
    const completionRate7d = totalPlanned > 0 ? totalCompleted / totalPlanned : 0;

    // ── 2. Rolling 7-day avg stress & fatigue ─────────────────────────────────
    const avgStress7d = recent7.length > 0
      ? recent7.reduce((s, c) => s + c.stressLevel, 0) / recent7.length
      : 3;
    const avgFatigue7d = recent7.length > 0
      ? recent7.reduce((s, c) => s + c.fatigueLevel, 0) / recent7.length
      : 3;

    // ── 3. Per-day-of-week completion rates (Mon=0..Sun=6) ───────────────────
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

    // ── Upsert ────────────────────────────────────────────────────────────────
    await this.prisma.studentProfile.upsert({
      where: { userId },
      create: {
        userId,
        completionRate7d,
        avgStress7d,
        avgFatigue7d,
        dowCompletionRates: JSON.stringify(dowCompletionRates),
        sweetSpotBlocks,
        stressNearExam,
        consistencyScore,
        totalSubmissions: 1,
      },
      update: {
        completionRate7d,
        avgStress7d,
        avgFatigue7d,
        dowCompletionRates: JSON.stringify(dowCompletionRates),
        sweetSpotBlocks,
        stressNearExam,
        consistencyScore,
        totalSubmissions: { increment: 1 },
      },
    });
  }

  // Aktif dönemi sonlandır
  async endTerm(userId: number): Promise<{ ok: boolean }> {
    await this.prisma.term.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, endedAt: getCurrentTime() },
    });
    return { ok: true };
  }

  // Aktif dönemi sonlandır ve yeni boş dönem başlat
  async startTerm(userId: number, name?: string): Promise<object> {
    await this.prisma.term.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, endedAt: getCurrentTime() },
    });
    return this.prisma.term.create({
      data: { userId, name: name ?? null, isActive: true },
    });
  }

  // Dijital ikiz profilini getir (yoksa boş oluştur)
  async getStudentProfile(userId: number) {
    return this.prisma.studentProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }
}