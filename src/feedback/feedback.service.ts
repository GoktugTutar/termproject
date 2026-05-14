import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeeklyFeedbackDto } from './dto/weekly-feedback.dto';
import { getCurrentTime } from '../utils/time.util';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  // Haftalık geri bildirim kaydet ve ders needsMoreTime değerlerini güncelle
  async saveWeeklyFeedback(userId: number, dto: WeeklyFeedbackDto) {
    const now = getCurrentTime();
    const weekStart = this.getWeekStart(now);

    // Bu hafta için mevcut feedback var mı kontrol et
    const existingFeedback = await this.prisma.weeklyFeedback.findFirst({
      where: { userId, weekStart },
    });

    let feedback;
    if (existingFeedback) {
      // Mevcut feedback'i güncelle
      feedback = await this.prisma.weeklyFeedback.update({
        where: { id: existingFeedback.id },
        data: { weekloadFeedback: dto.weekloadFeedback },
        include: { lessonFeedbacks: true },
      });
    } else {
      // Yeni feedback oluştur
      feedback = await this.prisma.weeklyFeedback.create({
        data: {
          userId,
          weekStart,
          weekloadFeedback: dto.weekloadFeedback,
          lessonFeedbacks: {
            create: dto.lessonFeedbacks.map((lf) => ({
              lessonId: lf.lessonId,
              needsMoreTime: lf.needsMoreTime,
            })),
          },
        },
        include: { lessonFeedbacks: true },
      });
    }

    // Her ders için needsMoreTime değerini güncelle
    for (const lf of dto.lessonFeedbacks) {
      await this.prisma.lesson.update({
        where: { id: lf.lessonId },
        data: { needsMoreTime: lf.needsMoreTime },
      });
    }

    return feedback;
  }

  // Haftanın başlangıcını (Pazartesi) hesapla
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

}