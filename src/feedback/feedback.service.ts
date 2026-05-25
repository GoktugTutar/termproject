import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeeklyFeedbackDto } from './dto/weekly-feedback.dto';
import { getCurrentTime } from '../utils/time.util';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  // Haftalık geri bildirim kaydet ve ders needsMoreTime değerlerini güncelle
  async saveWeeklyFeedback(userId: number, dto: WeeklyFeedbackDto) {
    const now = getCurrentTime();

    // Yalnızca Pazar günü gönderilebilir
    if (now.getDay() !== 0) {
      throw new BadRequestException('Haftalık geri bildirim yalnızca Pazar günü gönderilebilir.');
    }

    const weekStart = this.getWeekStart(now);

    // Bu hafta için mevcut feedback var mı kontrol et
    const existingFeedback = await this.prisma.weeklyFeedback.findFirst({
      where: { userId, weekStart },
    });

    let feedback;
    if (existingFeedback) {
      feedback = await this.prisma.weeklyFeedback.update({
        where: { id: existingFeedback.id },
        data: { weekloadFeedback: dto.weekloadFeedback },
        include: { lessonFeedbacks: true },
      });
    } else {
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

    // ── LOG ─────────────────────────────────────────────────────────────────
    console.log(`[FEEDBACK] userId=${userId} weekStart=${weekStart.toISOString().substring(0, 10)}`);
    console.log(`  weekloadFeedback=${dto.weekloadFeedback}`);
    console.log(`  lessonFeedbacks: ${dto.lessonFeedbacks.map(lf => `lesson ${lf.lessonId} needsMoreTime=${lf.needsMoreTime}`).join(', ')}`);
    // ────────────────────────────────────────────────────────────────────────

    // Her ders için needsMoreTime değerini güncelle
    for (const lf of dto.lessonFeedbacks) {
      await this.prisma.lesson.update({
        where: { id: lf.lessonId },
        data: { needsMoreTime: lf.needsMoreTime },
      });
    }

    return feedback;
  }

  // Bu hafta için weekly feedback gönderilip gönderilmediğini kontrol et
  async getWeeklyStatus(userId: number): Promise<{ submitted: boolean }> {
    const now = getCurrentTime();
    const weekStart = this.getWeekStart(now);
    const existing = await this.prisma.weeklyFeedback.findFirst({
      where: { userId, weekStart },
    });
    return { submitted: existing !== null };
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

  // Derse ait en yakın sınava kalan gün sayısını hesapla
  private daysUntilExam(lesson: { exams: Array<{ examDate: Date }> }, now: Date): number | null {
    if (lesson.exams.length === 0) return null;
    const future = lesson.exams
      .map((e) => Math.ceil((new Date(e.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      .filter((d) => d >= 0);
    return future.length > 0 ? Math.min(...future) : null;
  }
}