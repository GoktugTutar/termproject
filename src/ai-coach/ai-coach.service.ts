import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildWhatIfPrompt, WhatIfScenario } from './prompts/what-if.prompt';
import { buildCoachPrompt } from './prompts/coach.prompt';
import { getCurrentTime } from '../utils/time.util';

const OPENROUTER_MODEL = 'baidu/cobuddy:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

@Injectable()
export class AiCoachService {
  constructor(private prisma: PrismaService) {}

  // ── What-if ───────────────────────────────────────────────────────────────

  /** Kullanıcının seçtiği what-if senaryosuna göre AI yanıtı üretir. Planner'a dokunmaz. */
  async whatIfPreview(
    userId: number,
    scenario: WhatIfScenario,
    focusLessonId?: number,
    emptyDayName?: string,
    emptyDayBlockCount?: number,
  ) {
    const now = getCurrentTime();
    console.log(`[AC] whatIf userId=${userId} scenario=${scenario} focusLessonId=${focusLessonId ?? '-'} emptyDay=${emptyDayName ?? '-'}`);

    const [profile, lessons, weekBlocks, lastFeedback] = await Promise.all([
      this.prisma.studentProfile.findUnique({ where: { userId } }),
      this.prisma.lesson.findMany({ where: { userId }, include: { exams: true } }),
      this.prisma.scheduledBlock.findMany({
        where: { userId, weekStart: this.getWeekStart(now) },
        include: { lesson: true },
      }),
      this.prisma.weeklyFeedback.findFirst({
        where: { userId },
        orderBy: { weekStart: 'desc' },
      }),
    ]);

    console.log(`[AC] veri: profile=${profile ? 'var' : 'yok'} lessons=${lessons.length} weekBlocks=${weekBlocks.length} lastFeedback=${lastFeedback?.weekloadFeedback ?? 'yok'}`);

    const upcomingExams = lessons.flatMap((lesson) =>
      lesson.exams
        .map((exam) => ({
          lessonName: lesson.name,
          daysLeft: Math.ceil((new Date(exam.examDate).getTime() - now.getTime()) / 86400000),
          difficulty: lesson.difficulty,
        }))
        .filter((e) => e.daysLeft >= 0 && e.daysLeft <= 14),
    );

    // Odak ders context'i — ders_durumu / derse_odaklan senaryoları için
    let focusLessonName: string | undefined;
    let focusLessonCompletion: number | undefined;
    let focusLessonKeyfiDelayCount: number | undefined;

    if (focusLessonId) {
      const focusLesson = lessons.find((l) => l.id === focusLessonId);
      if (focusLesson) {
        focusLessonName = focusLesson.name;
        focusLessonKeyfiDelayCount = focusLesson.keyfiDelayCount;

        const recentItems = await this.prisma.checklistItem.findMany({
          where: {
            lessonId: focusLessonId,
            checklist: {
              userId,
              date: { gte: new Date(now.getTime() - 7 * 86400000) },
            },
          },
        });
        const planned = recentItems.reduce((s, i) => s + i.plannedBlocks, 0);
        const completed = recentItems.reduce((s, i) => s + i.completedBlocks, 0);
        focusLessonCompletion = planned > 0 ? completed / planned : 0;
        console.log(`[AC] odak ders: ${focusLessonName} completion=%${Math.round(focusLessonCompletion * 100)} delay=${focusLessonKeyfiDelayCount}`);
      } else {
        console.warn(`[AC] focusLessonId=${focusLessonId} bulunamadı`);
      }
    }

    const prompt = buildWhatIfPrompt({
      scenario,
      profile,
      upcomingExams,
      focusLessonName,
      focusLessonCompletion,
      focusLessonKeyfiDelayCount,
      emptyDayName,
      emptyDayBlockCount,
    });

    console.log(`[AC] prompt hazır: ${prompt.split('\n').length} satır, upcomingExams=${upcomingExams.length}`);

    const message = await this.callAi(prompt, 'whatIf');
    return { scenario, message };
  }

  // ── Daily coach ───────────────────────────────────────────────────────────

  /** Öğrencinin günlük durumuna göre koçluk mesajı üretir. Planner'a dokunmaz. */
  async getDailyCoachMessage(userId: number) {
    const now = getCurrentTime();
    const weekStart = this.getWeekStart(now);
    console.log(`[AC] dailyCoach userId=${userId}`);

    const [profile, lessons, weekBlocks, lastFeedback] = await Promise.all([
      this.prisma.studentProfile.findUnique({ where: { userId } }),
      this.prisma.lesson.findMany({ where: { userId }, include: { exams: true } }),
      this.prisma.scheduledBlock.findMany({
        where: { userId, weekStart },
        include: { lesson: true },
      }),
      this.prisma.weeklyFeedback.findFirst({
        where: { userId },
        orderBy: { weekStart: 'desc' },
      }),
    ]);

    console.log(`[AC] veri: profile=${profile ? 'var' : 'yok'} lessons=${lessons.length} weekBlocks=${weekBlocks.length} lastFeedback=${lastFeedback?.weekloadFeedback ?? 'yok'}`);

    const upcomingExams = lessons.flatMap((lesson) =>
      lesson.exams
        .map((exam) => ({
          lessonName: lesson.name,
          daysLeft: Math.ceil((new Date(exam.examDate).getTime() - now.getTime()) / 86400000),
          difficulty: lesson.difficulty,
        }))
        .filter((e) => e.daysLeft >= 0 && e.daysLeft <= 14),
    );

    // Bu haftaki blok özeti — ders bazında topla
    const blockMap = new Map<number, { lessonName: string; blockCount: number; isReview: boolean }>();
    for (const block of weekBlocks) {
      const existing = blockMap.get(block.lessonId);
      if (existing) {
        existing.blockCount += block.blockCount;
      } else {
        blockMap.set(block.lessonId, {
          lessonName: block.lesson.name,
          blockCount: block.blockCount,
          isReview: block.isReview,
        });
      }
    }

    const delayedLessons = lessons
      .filter((l) => l.keyfiDelayCount >= 2)
      .map((l) => ({ lessonName: l.name, delayCount: l.keyfiDelayCount }));

    console.log(`[AC] upcomingExams=${upcomingExams.length} delayedLessons=${delayedLessons.length} thisWeekBlocks=${blockMap.size}`);

    const prompt = buildCoachPrompt({
      profile,
      upcomingExams,
      weeklyFeedback: (lastFeedback?.weekloadFeedback as any) ?? null,
      thisWeekBlocks: [...blockMap.values()],
      delayedLessons,
    });

    const message = await this.callAi(prompt, 'dailyCoach');
    return { message };
  }

  // ── OpenRouter çağrısı ────────────────────────────────────────────────────

  /** OpenRouter üzerinden AI çağrısı yapar. caller parametresi log'da görünür. */
  private async callAi(prompt: string, caller: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn(`[AC] OPENROUTER_API_KEY bulunamadı (caller=${caller})`);
      return '';
    }

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      console.log(`[AC] OpenRouter status=${response.status} caller=${caller}`);

      if (response.status !== 200) {
        console.error(`[AC] OpenRouter hata yanıtı:`, JSON.stringify(data).substring(0, 200));
        return '';
      }

      const text = data?.choices?.[0]?.message?.content?.trim() ?? '';
      if (text) {
        console.log(`[AC] yanıt (${caller}): ${text.substring(0, 120)}...`);
      } else {
        console.warn(`[AC] yanıt boş geldi (caller=${caller})`);
      }
      return text;
    } catch (err) {
      console.error(`[AC] OpenRouter hatası (caller=${caller}):`, err);
      return '';
    }
  }

  // ── Yardımcılar ───────────────────────────────────────────────────────────

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}