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

  /** Generates an AI response for the user's selected what-if scenario. Does not touch the planner. */
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

    // Focus-lesson context — for 'ders_durumu' / 'derse_odaklan' scenarios
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

    const sleepMetrics = (profile?.goodSleepCompletionRate !== null && profile?.goodSleepCompletionRate !== undefined)
      ? {
          goodSleepCompletionRate: profile.goodSleepCompletionRate,
          badSleepCompletionRate: profile.badSleepCompletionRate ?? null,
          goodSleepAvgStress: profile.goodSleepAvgStress ?? null,
          badSleepAvgStress: profile.badSleepAvgStress ?? null,
        }
      : null;

    const prompt = buildWhatIfPrompt({
      scenario,
      profile: profile
        ? {
            completionRate7d: profile.completionRate7d,
            avgStress7d: profile.avgStress7d,
            consistencyScore: profile.consistencyScore,
            stressNearExam: profile.stressNearExam,
            hasUpcomingExam: upcomingExams.length > 0,
          }
        : null,
      upcomingExams,
      focusLessonName,
      focusLessonCompletion,
      focusLessonKeyfiDelayCount,
      emptyDayName,
      emptyDayBlockCount,
      sleepMetrics,
    });

    console.log(`[AC] prompt hazır: ${prompt.split('\n').length} satır, upcomingExams=${upcomingExams.length}`);

    const message = await this.callAi(prompt, 'whatIf');
    return { scenario, message };
  }

  // ── Daily coach ───────────────────────────────────────────────────────────

  /** Generates a coaching message based on the student's daily situation. Does not touch the planner. */
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

    // This week's block summary — aggregate per lesson
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

    const sleepMetrics = (profile?.goodSleepCompletionRate !== null && profile?.goodSleepCompletionRate !== undefined)
      ? {
          goodSleepCompletionRate: profile.goodSleepCompletionRate,
          badSleepCompletionRate: profile.badSleepCompletionRate ?? null,
          goodSleepAvgStress: profile.goodSleepAvgStress ?? null,
          badSleepAvgStress: profile.badSleepAvgStress ?? null,
        }
      : null;

    const prompt = buildCoachPrompt({
      profile: profile
        ? {
            completionRate7d: profile.completionRate7d,
            avgStress7d: profile.avgStress7d,
            consistencyScore: profile.consistencyScore,
            stressNearExam: profile.stressNearExam,
            hasUpcomingExam: upcomingExams.length > 0,
          }
        : null,
      upcomingExams,
      weeklyFeedback: (lastFeedback?.weekloadFeedback as any) ?? null,
      thisWeekBlocks: [...blockMap.values()],
      delayedLessons,
      sleepMetrics,
    });

    const message = await this.callAi(prompt, 'dailyCoach');
    return { message };
  }

  // ── OpenRouter call ───────────────────────────────────────────────────────

  /** Makes an AI call via OpenRouter. The caller parameter appears in logs. */
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}