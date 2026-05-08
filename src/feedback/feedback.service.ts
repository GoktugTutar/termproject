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

  // Aktif uyarı ve öneri mesajlarını getir
  async getMessages(userId: number) {
    const now = getCurrentTime();
    const messages: Array<{ type: string; message: string; suggestion: string }> = [];

    // Son 3 haftalık feedback'i getir
    const recentFeedbacks = await this.prisma.weeklyFeedback.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
      take: 3,
    });

    // Kullanıcının derslerini sınav tarihleriyle birlikte getir
    const lessons = await this.prisma.lesson.findMany({
      where: { userId },
      include: { exams: true },
    });

    // Tetikleyici 3: İki hafta üst üste çok yoğundu geri bildirimi
    if (recentFeedbacks.length >= 2) {
      const last2 = recentFeedbacks.slice(0, 2);
      if (last2.every((f) => f.weekloadFeedback === 'cok_yogundu')) {
        messages.push({
          type: 'asiri_yuk',
          message: 'İki haftadır program çok yoğun geliyor. Önümüzdeki hafta otomatik %15 hafifletildi.',
          suggestion: "BusyTime'ları gözden geçirmeyi düşün.",
        });
      }
    }

    // Tetikleyici 4 Case 3: Sınav yakın ama az saat ayrılmış
    for (const lesson of lessons) {
      const u = this.daysUntilExam(lesson, now);
      if (u !== null && u <= 7) {
        messages.push({
          type: 'sinav_yakin',
          message: `${lesson.name} sınavına ${u} gün kaldı. Öncelik KRİTİK'e alındı.`,
          suggestion: 'Bu derse bu hafta daha fazla zaman ayır.',
        });
      }
    }

    // Tetikleyici 4 Case 2: Ders sık erteleniyor → slotlu mod uyarısı
    for (const lesson of lessons) {
      if (lesson.keyfiDelayCount >= 2) {
        messages.push({
          type: 'sik_erteleme',
          message: `${lesson.name} sık erteleniyor, slotlu mod devreye alındı.`,
          suggestion: 'Bu dersi en az her 3 günde bir planlaman önerilir.',
        });
      }
    }

    return messages;
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
