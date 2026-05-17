import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentTime } from '../utils/time.util';
import { step0Burnout } from './algorithm/step0-burnout';
import { step1Multiplier } from './algorithm/step1-multiplier';
import { step2Pool } from './algorithm/step2-pool';
import { step3ReviewBlocks } from './algorithm/step3-review-blocks';
import { step4CalculateX } from './algorithm/step4-calculate-x';
import { step5DayDistribution } from './algorithm/step5-day-distribution';
import { step6Priority } from './algorithm/step6-priority';
import { step7CognitiveLoad } from './algorithm/step7-cognitive-load';
import { step7_5PlaceReview } from './algorithm/step7_5-place-review';
import { step8Placement } from './algorithm/step8-placement';
import { step9Recalculate } from './algorithm/step9-recalculate';

@Injectable()
export class PlannerService {
  constructor(private prisma: PrismaService) {}

  // Haftanın başlangıcını (Pazartesi) hesapla
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0=Paz, 1=Pzt
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // "HH:MM" string'ini gün içi dakikaya çevir
  private timeToMin(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  // Dakikayı "HH:MM" string'ine çevir
  private minToTime(min: number): string {
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

  // Çakışan busy slotları birleştir (merge)
  private mergeBusySlots(slots: Array<{ startTime: string; endTime: string }>): Array<{ start: number; end: number }> {
    if (slots.length === 0) return [];

    const intervals = slots
      .map((s) => ({ start: this.timeToMin(s.startTime), end: this.timeToMin(s.endTime) }))
      .sort((a, b) => a.start - b.start);

    const merged = [{ ...intervals[0] }];
    for (let i = 1; i < intervals.length; i++) {
      const last = merged[merged.length - 1];
      if (intervals[i].start <= last.end) {
        last.end = Math.max(last.end, intervals[i].end);
      } else {
        merged.push({ ...intervals[i] });
      }
    }
    return merged;
  }

  // Bir gün için 08:00-24:00 arasındaki boş zaman dilimlerini hesapla
  private getFreeWindows(mergedBusy: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
    const dayStart = 8 * 60;  // 08:00
    const dayEnd = 24 * 60;   // 24:00 (gece yarısı)
    const free: Array<{ start: number; end: number }> = [];
    let current = dayStart;

    for (const busy of mergedBusy) {
      if (busy.start > current) {
        free.push({ start: current, end: Math.min(busy.start, dayEnd) });
      }
      current = Math.max(current, busy.end);
    }

    if (current < dayEnd) {
      free.push({ start: current, end: dayEnd });
    }

    return free;
  }

  // Haftalık plan oluştur: tüm algoritma adımlarını çalıştır ve veritabanına kaydet
  async createWeeklyPlan(userId: number, forDate?: Date) {
    const now = forDate ?? getCurrentTime();
    const weekStart = this.getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Kullanıcı verilerini al (busy slotlar, dersler, geri bildirimler, checklistler)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        busySlots: true,
        lessons: { include: { exams: true, deadlines: true } },
        weeklyFeedbacks: { orderBy: { weekStart: 'desc' }, take: 1 },
        checklists: {
          where: { date: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
          include: { items: true },
        },
      },
    });

    if (!user) throw new Error('Kullanıcı bulunamadı');

    // Son 7 günün tamamlanma oranını hesapla (ADIM 0 için)
    const recentChecklists = user.checklists;
    const totalPlanned = recentChecklists.reduce(
      (sum, c) => sum + c.items.reduce((s, i) => s + i.plannedBlocks, 0), 0
    );
    const totalCompleted = recentChecklists.reduce(
      (sum, c) => sum + c.items.reduce((s, i) => s + i.completedBlocks, 0), 0
    );

    const lastFeedback = user.weeklyFeedbacks[0] ?? null;

    // ADIM 0: Tükenmişlik sinyali → max blok miktarını güncelle
    const defaultMaxBlocks = user.studyStyle === 'deep_focus' ? 4
      : user.studyStyle === 'distributed' ? 2 : 3;
    const { maxBlocksPerSession } = step0Burnout(totalCompleted, totalPlanned, defaultMaxBlocks);

    // ADIM 1: Haftalık geri bildirim çarpanı
    const multiplier = step1Multiplier(lastFeedback?.weekloadFeedback ?? null);

    // ADIM 2: Efektif blok havuzu
    const effectiveBlocks = step2Pool(multiplier);

    // ── LOG: Planner inputs ─────────────────────────────────────────────────
    console.log(`[PLANNER] createWeeklyPlan userId=${userId} weekStart=${weekStart.toISOString().substring(0, 10)}`);
    console.log(`  studyStyle=${user.studyStyle} defaultMaxBlocks=${defaultMaxBlocks} maxBlocksPerSession=${maxBlocksPerSession}`);
    console.log(`  completionRate: ${totalCompleted}/${totalPlanned} blocks completed in last 7 days`);
    console.log(`  lastFeedback weekload=${lastFeedback?.weekloadFeedback ?? 'none'} → multiplier=${multiplier}`);
    console.log(`  effectiveBlocks=${effectiveBlocks}`);
    console.log(`  lessons: ${user.lessons.map(l => `[${l.id}] ${l.name} diff=${l.difficulty} needsMoreTime=${l.needsMoreTime} keyfiDelay=${l.keyfiDelayCount} zorunluDelay=${l.zorunluDelayCount}`).join(', ')}`);
    // ────────────────────────────────────────────────────────────────────────

    // Hafta günlerini (Pazartesi-Pazar) oluştur
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dayOfWeek = i + 1; // 1=Pzt, 7=Paz
      const dayBusySlots = user.busySlots.filter((s) => s.dayOfWeek === dayOfWeek);
      return { date, dayOfWeek, busySlots: dayBusySlots };
    });

    // ADIM 3: Sınav tekrar bloklarını ayır
    const { reviewBlocks, reservedByLesson } = step3ReviewBlocks(
      user.lessons,
      effectiveBlocks,
      weekStart,
      weekEnd,
    );

    // ADIM 4: Her ders için blok tahsisi hesapla
    const allocations = step4CalculateX(user.lessons, effectiveBlocks);
    const lessonAllocations: Record<number, number> = {};
    for (const alloc of allocations) {
      lessonAllocations[alloc.lessonId] = alloc.effectiveBlocks;
    }

    // ADIM 5: Blokları günlere dağıt ve session limitlerini belirle
    const dayConfigs = step5DayDistribution(
      effectiveBlocks,
      weekDays,
      user.studyStyle,
      maxBlocksPerSession,
    );

    // ADIM 6: Dersleri öncelik sırasına göre sırala
    const priorities = step6Priority(user.lessons, now);

    // ADIM 7: Bilişsel yük dengesini uygula
    const lessonMap = new Map(user.lessons.map((l) => [l.id, l]));
    // slottedMode bilgisini ayrı bir map'te tut (step7CognitiveLoad bu alanı döndürmez)
    const slottedModeMap = new Map(priorities.map((p) => [p.lessonId, p.slottedMode]));
    const orderedWithDifficulty = priorities.map((p) => ({
      lessonId: p.lessonId,
      difficulty: lessonMap.get(p.lessonId)?.difficulty ?? 3,
      priority: p.priority,
    }));
    const cognitiveOrdered = step7CognitiveLoad(orderedWithDifficulty);


    // Her gün için boş zaman pencerelerini oluştur
    const freeWindows: Record<string, Array<{ start: number; end: number }>> = {};
    for (const day of weekDays) {
      const dateStr = this.toLocalDateStr(day.date);
      const mergedBusy = this.mergeBusySlots(
        day.busySlots.map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
      );
      freeWindows[dateStr] = this.getFreeWindows(mergedBusy);
    }

    // ADIM 7.5: Tekrar bloklarını önce yerleştir
    const { placed: reviewPlaced, updatedAllocations, updatedFreeWindows } = step7_5PlaceReview(
      reviewBlocks,
      freeWindows,
      user.preferredStudyTime,
      lessonAllocations,
    );

    // ADIM 8: Dersleri gün/ders sınıfı eşleşmesiyle yerleştir
    const { placed: lessonPlaced, notFitted, programZorlastu } = step8Placement(
      cognitiveOrdered.map((l) => ({
        lessonId: l.lessonId,
        slottedMode: slottedModeMap.get(l.lessonId) ?? false,
        difficulty: l.difficulty,
        priority: l.priority,
      })),
      updatedAllocations,
      dayConfigs,
      updatedFreeWindows,
      user.preferredStudyTime,
    );


    // ── LOG: Placement results ─────────────────────────────────────────────
    console.log(`[PLANNER] placement results: ${lessonPlaced.length} lesson blocks + ${reviewPlaced.length} review blocks placed`);
    if (Object.keys(notFitted).length > 0) {
      console.log(`  NOT FITTED:`, notFitted);
    }
    if (programZorlastu) {
      console.log(`  programZorlastu=true`);
    }
    // ────────────────────────────────────────────────────────────────────────

    // Mevcut hafta bloklarını sil ve yenilerini veritabanına kaydet
    await this.prisma.scheduledBlock.deleteMany({
      where: { userId, weekStart },
    });

    const allBlocks = [...reviewPlaced, ...lessonPlaced];
    for (const block of allBlocks) {
      await this.prisma.scheduledBlock.create({
        data: {
          userId,
          lessonId: block.lessonId,
          date: block.date,
          startTime: this.minToTime(block.startMin),
          endTime: this.minToTime(block.endMin),
          blockCount: block.blockCount ?? Math.round((block.endMin - block.startMin) / 30),
          isReview: block.isReview,
          weekStart,
        },
      });
    }

    const weekBlocks = await this.getWeekBlocks(userId, now);
    return { ...weekBlocks, programZorlastu };
  }

  // Haftanın planlanan bloklarını getir
  async getWeekBlocks(userId: number, forDate?: Date) {
    const now = forDate ?? getCurrentTime();
    const weekStart = this.getWeekStart(now);

    const blocks = await this.prisma.scheduledBlock.findMany({
      where: { userId, weekStart },
      include: { lesson: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return { weekStart, blocks };
  }

  // BusySlot değişikliğinde kalan günleri yeniden hesapla (ADIM 9)
  async recalculate(userId: number) {
    const now = getCurrentTime();
    const weekStart = this.getWeekStart(now);

    // Geçmiş günlerde tamamlanan blokları ders bazında topla
    const completedItems = await this.prisma.checklistItem.findMany({
      where: {
        checklist: {
          userId,
          date: { gte: weekStart, lte: now },
        },
      },
    });

    const completedByLesson: Record<number, number> = {};
    for (const item of completedItems) {
      completedByLesson[item.lessonId] = (completedByLesson[item.lessonId] ?? 0) + item.completedBlocks;
    }

    // Mevcut hafta tahsislerini ders bazında topla
    const existingBlocks = await this.prisma.scheduledBlock.findMany({
      where: { userId, weekStart },
    });

    const allocatedByLesson: Record<number, number> = {};
    for (const block of existingBlocks) {
      allocatedByLesson[block.lessonId] = (allocatedByLesson[block.lessonId] ?? 0) + block.blockCount;
    }

    // ADIM 9: Kalan blokları hesapla
    const remainingAllocations = step9Recalculate(allocatedByLesson, completedByLesson);

    // Zorunlu delay kontrolü: sığmayan dersler için sayaçları güncelle
    for (const [lessonIdStr, remaining] of Object.entries(remainingAllocations)) {
      const lessonId = parseInt(lessonIdStr);
      if (remaining > 0) {
        await this.prisma.lesson.update({
          where: { id: lessonId },
          data: {
            zorunluDelayCount: { increment: 1 },
            zorunluMissedBlocks: { increment: remaining },
          },
        });
      }
    }

    // Yeni planı oluştur
    return this.createWeeklyPlan(userId);
  }
}