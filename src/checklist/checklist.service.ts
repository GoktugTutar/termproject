import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { getCurrentTime } from '../utils/time.util';

@Injectable()
export class ChecklistService {
  constructor(private prisma: PrismaService) {}

  // Günlük checklist gönder: stres/yorgunluk ve ders ilerlemelerini kaydet
  async submit(userId: number, dto: SubmitChecklistDto) {
    const now = getCurrentTime();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

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

      if (existing) {
        await this.prisma.checklistItem.update({
          where: { id: existing.id },
          data: {
            plannedBlocks: item.plannedBlocks,
            completedBlocks: item.completedBlocks,
            delayed: item.delayed ?? false,
          },
        });
      } else {
        await this.prisma.checklistItem.create({
          data: {
            checklistId: checklist.id,
            lessonId: item.lessonId,
            plannedBlocks: item.plannedBlocks,
            completedBlocks: item.completedBlocks,
            delayed: item.delayed ?? false,
          },
        });
      }

      // Keyfi erteleme: dersin delay sayacını artır
      if (item.delayed) {
        await this.prisma.lesson.update({
          where: { id: item.lessonId },
          data: { keyfiDelayCount: { increment: 1 } },
        });
      }
    }

    return this.getByDate(userId, today.toISOString().substring(0, 10));
  }

  // Tarihe göre günlük checklist getir
  async getByDate(userId: number, dateStr: string) {
    const date = new Date(dateStr);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    return this.prisma.dailyChecklist.findFirst({
      where: { userId, date: { gte: date, lt: nextDay } },
      include: { items: true },
    });
  }
}
