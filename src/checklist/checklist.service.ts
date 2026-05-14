import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { getCurrentTime } from '../utils/time.util';

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
    const day = d.getDay(); // 0=Paz, 1=Pzt
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  private async hasChecklistForDate(
    userId: number,
    date: Date,
  ): Promise<boolean> {
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
      data: {
        keyfiDelayCount: Math.max(0, lesson.keyfiDelayCount + delta),
      },
    });
  }

  // Günlük checklist gönder: stres/yorgunluk ve ders ilerlemelerini kaydet
  async submit(userId: number, dto: SubmitChecklistDto) {
    const today = dto.date
      ? this.parseLocalDate(dto.date)
      : this.startOfLocalDay(getCurrentTime());
    const tomorrow = this.nextLocalDay(today);

    // Bugüne ait checklist'i bul veya oluştur
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
    } else {
      // Mevcut checklist'i güncelle
      await this.prisma.dailyChecklist.update({
        where: { id: checklist.id },
        data: { stressLevel: dto.stressLevel, fatigueLevel: dto.fatigueLevel },
      });
    }

    // Her ders için item'ı güncelle veya oluştur
    for (const item of dto.items) {
      const existing = await this.prisma.checklistItem.findFirst({
        where: { checklistId: checklist.id, lessonId: item.lessonId },
      });

      const delayed = item.completedBlocks < item.plannedBlocks;
      const delayDelta = existing
        ? delayed === existing.delayed
          ? 0
          : delayed
            ? 1
            : -1
        : delayed
          ? 1
          : 0;

      if (existing) {
        await this.prisma.checklistItem.update({
          where: { id: existing.id },
          data: {
            plannedBlocks: item.plannedBlocks,
            completedBlocks: item.completedBlocks,
            delayed,
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
          },
        });
      }

      // Keyfi erteleme yalnızca submit edilmiş ve eksik kalmış derslerden gelir.
      await this.adjustLessonDelayCount(item.lessonId, delayDelta);
    }

    // Dijital ikiz profilini güncelle
    this.userService.updateStudentProfile(userId).catch(() => {}); // fire-and-forget

    return this.getByDate(userId, this.toLocalDateStr(today));
  }

  // Son `days` günün checklist durumunu döndürür:
  // hasBlocks (o gün planlanmış blok var mı) ve hasChecklist (checklist girildi mi)
  async getHistory(userId: number, days: number) {
    const today = this.startOfLocalDay(getCurrentTime());
    const result: { date: string; hasBlocks: boolean; hasChecklist: boolean }[] =
      [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const nextDay = this.nextLocalDay(d);

      const [blockCount, checklistCount] = await Promise.all([
        this.prisma.scheduledBlock.count({
          where: { userId, date: { gte: d, lt: nextDay } },
        }),
        this.prisma.dailyChecklist.count({
          where: { userId, date: { gte: d, lt: nextDay } },
        }),
      ]);

      result.push({
        date: this.toLocalDateStr(d),
        hasBlocks: blockCount > 0,
        hasChecklist: checklistCount > 0,
      });
    }

    return result;
  }

  // Tarihe göre günlük checklist getir
  async getByDate(userId: number, dateStr: string) {
    const date = this.parseLocalDate(dateStr);
    const nextDay = this.nextLocalDay(date);

    return this.prisma.dailyChecklist.findFirst({
      where: { userId, date: { gte: date, lt: nextDay } },
      include: { items: true },
    });
  }

  // Belirli bir günde kullanıcının planlanmış bloğu var mı kontrol eder
  private async hasScheduledBlocksForDate(
    userId: number,
    date: Date,
  ): Promise<boolean> {
    const nextDay = this.nextLocalDay(date);
    const count = await this.prisma.scheduledBlock.count({
      where: { userId, date: { gte: date, lt: nextDay } },
    });
    return count > 0;
  }

  // Haftanın başından bugüne (bugün hariç) checklist durumunu döndürür.
  // Sadece o gün planlanmış bloğu olan günler eksik sayılır.
  // Pazartesi çağrıldığında weekStart == date olduğundan döngü hiç çalışmaz
  // → geçen hafta eksik checklistler yeni haftayı engellemez.
  async getStatus(userId: number, dateStr: string) {
    const date = this.parseLocalDate(dateStr);
    const weekStart = this.getWeekStart(date);
    const missingDates: string[] = [];

    for (
      let cursor = new Date(weekStart);
      cursor < date;
      cursor = this.nextLocalDay(cursor)
    ) {
      const hasBlocks = await this.hasScheduledBlocksForDate(userId, cursor);
      if (hasBlocks && !(await this.hasChecklistForDate(userId, cursor))) {
        missingDates.push(this.toLocalDateStr(cursor));
      }
    }

    return {
      date: this.toLocalDateStr(date),
      blocked: missingDates.length > 0,
      missingDates,
      checklist: await this.getByDate(userId, this.toLocalDateStr(date)),
    };
  }
}
