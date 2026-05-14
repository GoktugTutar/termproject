import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentTime } from '../utils/time.util';

@Injectable()
export class SystemFeedbackService {
  constructor(private prisma: PrismaService) {}

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

    // Tetikleyici 5: Son 3 günde stres >= 4 → yük azaltma önerisi
    const last3Days = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const recentChecklists = await this.prisma.dailyChecklist.findMany({
      where: {
        userId,
        date: { gte: last3Days[2], lte: now },
      },
      orderBy: { date: 'desc' },
      take: 3,
    });

    if (recentChecklists.length >= 3) {
      const allHighStress = recentChecklists.every((c) => c.stressLevel >= 4);
      if (allHighStress) {
        messages.push({
          type: 'yuksek_stres',
          message: `Son 3 gündür stres seviyeniz yüksek (≥4).`,
          suggestion: 'Meşguliyet slotlarını gözden geçirmeyi veya daha hafif bir hafta planlamayı düşün.',
        });
      }
    }

    // Tetikleyici 6: Son 2 günde tamamlanan blok yok → hareketsizlik uyarısı
    const last2Days = Array.from({ length: 2 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i - 1); // dün ve önceki gün
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const inactiveChecklists = await this.prisma.dailyChecklist.findMany({
      where: {
        userId,
        date: { gte: last2Days[1], lt: new Date(now.setHours(0, 0, 0, 0)) },
      },
      include: { items: true },
    });

    // Her iki gün için de checklist var ve tamamlanan blok = 0
    if (inactiveChecklists.length >= 2) {
      const bothInactive = inactiveChecklists.every((c) =>
        c.items.reduce((sum, item) => sum + item.completedBlocks, 0) === 0,
      );
      if (bothInactive) {
        messages.push({
          type: 'hareketsizlik',
          message: 'Son 2 gündür hiç çalışma bloğu tamamlanmadı.',
          suggestion: 'Bugün kısa bir oturumla başlamayı dene — 30 dakika bile fark yaratır.',
        });
      }
    }

    return messages;
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