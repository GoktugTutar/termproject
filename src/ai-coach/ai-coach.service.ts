import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildWhatIfPrompt, WhatIfScenario } from './prompts/what-if.prompt';
import { buildCoachPrompt } from './prompts/coach.prompt';
import { buildExamResultPrompt } from './prompts/exam-result.prompt';
import { getCurrentTime } from '../utils/time.util';

const OPENROUTER_MODEL = 'baidu/cobuddy:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

@Injectable()
export class AiCoachService {
  constructor(private prisma: PrismaService) {}

  // ── What-if ───────────────────────────────────────────────────────────────

  async whatIfPreview(
    userId: number,
    scenario: WhatIfScenario,
    focusLessonId?: number,
    emptyDayName?: string,
    emptyDayBlockCount?: number,
  ) {
    const now = getCurrentTime();
    console.log(
      `[AC] whatIf userId=${userId} scenario=${scenario} focusLessonId=${focusLessonId ?? '-'} emptyDay=${emptyDayName ?? '-'}`,
    );

    const [profile, lessons, weekBlocks, lastFeedback] = await Promise.all([
      this.prisma.studentProfile.findUnique({ where: { userId } }),
      this.prisma.lesson.findMany({
        where: { userId },
        include: { exams: true },
      }),
      this.prisma.scheduledBlock.findMany({
        where: { userId, weekStart: this.getWeekStart(now) },
        include: { lesson: true },
      }),
      this.prisma.weeklyFeedback.findFirst({
        where: { userId },
        orderBy: { weekStart: 'desc' },
      }),
    ]);

    console.log(
      `[AC] veri: profile=${profile ? 'var' : 'yok'} lessons=${lessons.length} weekBlocks=${weekBlocks.length} lastFeedback=${lastFeedback?.weekloadFeedback ?? 'yok'}`,
    );

    const upcomingExams = lessons.flatMap((lesson) =>
      lesson.exams
        .map((exam) => ({
          lessonName: lesson.name,
          daysLeft: Math.ceil(
            (new Date(exam.examDate).getTime() - now.getTime()) / 86400000,
          ),
          difficulty: lesson.difficulty,
        }))
        .filter((e) => e.daysLeft >= 0 && e.daysLeft <= 14),
    );

    // Focus-lesson context
    let focusLessonName: string | undefined;
    let focusLessonCompletion: number | undefined;
    let focusLessonKeyfiDelayCount: number | undefined;
    let focusLessonLastExamResult: {
      satisfied: boolean;
      failReason?: string | null;
    } | null = null;

    if (focusLessonId) {
      const focusLesson = lessons.find((l) => l.id === focusLessonId);
      if (focusLesson) {
        focusLessonName = focusLesson.name;
        focusLessonKeyfiDelayCount = focusLesson.keyfiDelayCount;

        const [recentItems, lastExamResult] = await Promise.all([
          this.prisma.checklistItem.findMany({
            where: {
              lessonId: focusLessonId,
              checklist: {
                userId,
                date: { gte: new Date(now.getTime() - 7 * 86400000) },
              },
            },
          }),
          // Most recent exam result for this lesson
          this.prisma.examResult.findFirst({
            where: { userId, lessonId: focusLessonId },
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        const planned = recentItems.reduce((s, i) => s + i.plannedBlocks, 0);
        const completed = recentItems.reduce(
          (s, i) => s + i.completedBlocks,
          0,
        );
        focusLessonCompletion = planned > 0 ? completed / planned : 0;

        if (lastExamResult) {
          focusLessonLastExamResult = {
            satisfied: lastExamResult.satisfied ?? true,
            failReason: lastExamResult.failReason ?? null,
          };
        }

        console.log(
          `[AC] odak ders: ${focusLessonName} completion=%${Math.round(focusLessonCompletion * 100)} delay=${focusLessonKeyfiDelayCount} lastExam=${lastExamResult ? (lastExamResult.satisfied ? 'satisfied' : (lastExamResult.failReason ?? 'unsatisfied')) : 'none'}`,
        );
      } else {
        console.warn(`[AC] focusLessonId=${focusLessonId} bulunamadı`);
      }
    }

    const sleepMetrics =
      profile?.goodSleepCompletionRate !== null &&
      profile?.goodSleepCompletionRate !== undefined
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
      focusLessonLastExamResult,
      emptyDayName,
      emptyDayBlockCount,
      sleepMetrics,
    });

    console.log(
      `[AC] prompt hazır: ${prompt.split('\n').length} satır, upcomingExams=${upcomingExams.length}`,
    );

    const message = await this.callAi(prompt, 'whatIf');
    return { scenario, message };
  }

  // ── Daily coach ───────────────────────────────────────────────────────────

  async getDailyCoachMessage(userId: number) {
    const now = getCurrentTime();
    const weekStart = this.getWeekStart(now);
    console.log(`[AC] dailyCoach userId=${userId}`);

    const [profile, lessons, weekBlocks, lastFeedback] = await Promise.all([
      this.prisma.studentProfile.findUnique({ where: { userId } }),
      this.prisma.lesson.findMany({
        where: { userId },
        include: { exams: true },
      }),
      this.prisma.scheduledBlock.findMany({
        where: { userId, weekStart },
        include: { lesson: true },
      }),
      this.prisma.weeklyFeedback.findFirst({
        where: { userId },
        orderBy: { weekStart: 'desc' },
      }),
    ]);

    console.log(
      `[AC] veri: profile=${profile ? 'var' : 'yok'} lessons=${lessons.length} weekBlocks=${weekBlocks.length} lastFeedback=${lastFeedback?.weekloadFeedback ?? 'yok'}`,
    );

    const upcomingExams = lessons.flatMap((lesson) =>
      lesson.exams
        .map((exam) => ({
          lessonName: lesson.name,
          daysLeft: Math.ceil(
            (new Date(exam.examDate).getTime() - now.getTime()) / 86400000,
          ),
          difficulty: lesson.difficulty,
        }))
        .filter((e) => e.daysLeft >= 0 && e.daysLeft <= 14),
    );

    const blockMap = new Map<
      number,
      { lessonName: string; blockCount: number; isReview: boolean }
    >();
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

    console.log(
      `[AC] upcomingExams=${upcomingExams.length} delayedLessons=${delayedLessons.length} thisWeekBlocks=${blockMap.size}`,
    );

    const sleepMetrics =
      profile?.goodSleepCompletionRate !== null &&
      profile?.goodSleepCompletionRate !== undefined
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

  // ── Exam result coach ─────────────────────────────────────────────────────

  /**
   * Called after an ExamResult is saved with satisfied=false.
   * Fetches prep data for that lesson in the weeks before the exam
   * and generates a personalised coaching response.
   */
  async getExamResultCoachMessage(
    userId: number,
    examResultId: number,
  ): Promise<{ message: string }> {
    const now = getCurrentTime();
    console.log(
      `[AC] examResultCoach userId=${userId} examResultId=${examResultId}`,
    );

    const examResult = await this.prisma.examResult.findUnique({
      where: { id: examResultId },
      include: {
        exam: true,
        lesson: true,
      },
    });

    if (!examResult || examResult.userId !== userId || !examResult.failReason) {
      console.warn(
        `[AC] examResult ${examResultId} not found or no failReason`,
      );
      return { message: '' };
    }

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    // Fetch prep data: checklists for this lesson in the 3 weeks before the exam
    const examDate = new Date(examResult.exam.examDate);
    const prepStart = new Date(examDate.getTime() - 21 * 86400000);

    const prepChecklists = await this.prisma.dailyChecklist.findMany({
      where: {
        userId,
        date: { gte: prepStart, lte: examDate },
      },
      include: { items: true },
      orderBy: { date: 'asc' },
    });

    // Completion rate for this lesson during prep period
    let prepPlanned = 0;
    let prepCompleted = 0;
    let prepDelayCount = 0;
    for (const c of prepChecklists) {
      for (const item of c.items) {
        if (item.lessonId !== examResult.lessonId) continue;
        prepPlanned += item.plannedBlocks;
        prepCompleted += item.completedBlocks;
        if (item.delayed) prepDelayCount++;
      }
    }
    const prepCompletionRate =
      prepPlanned > 0 ? prepCompleted / prepPlanned : 0;

    // Average stress during prep period
    const prepAvgStress =
      prepChecklists.length > 0
        ? prepChecklists.reduce((s, c) => s + c.stressLevel, 0) /
          prepChecklists.length
        : 3;

    // Sleep the night before the exam
    const nightBefore = new Date(examDate);
    nightBefore.setDate(nightBefore.getDate() - 1);
    const nightBeforeStr = this.toLocalDateStr(nightBefore);
    const nightBeforeChecklist = prepChecklists.find(
      (c) => this.toLocalDateStr(new Date(c.date)) === nightBeforeStr,
    );
    const sleptWellBeforeExam = nightBeforeChecklist?.sleptWell ?? null;

    console.log(
      `[AC] examResultCoach: lesson=${examResult.lesson.name} prepCompletion=%${Math.round(prepCompletionRate * 100)} prepStress=${prepAvgStress.toFixed(1)} prepDelays=${prepDelayCount} sleptWell=${sleptWellBeforeExam}`,
    );

    const prompt = buildExamResultPrompt({
      lessonName: examResult.lesson.name,
      difficulty: examResult.lesson.difficulty,
      failReason: examResult.failReason,
      prepCompletionRate,
      prepAvgStress,
      prepDelayCount,
      sleptWellBeforeExam,
      profile: profile
        ? {
            completionRate7d: profile.completionRate7d,
            avgStress7d: profile.avgStress7d,
            consistencyScore: profile.consistencyScore,
            stressNearExam: profile.stressNearExam,
          }
        : null,
    });

    const message =
      (await this.callAi(prompt, 'examResultCoach')) ||
      this.buildExamResultFallbackMessage({
        lessonName: examResult.lesson.name,
        failReason: examResult.failReason,
        prepCompletionRate,
        prepAvgStress,
        prepDelayCount,
        sleptWellBeforeExam,
      });
    return { message };
  }

  private buildExamResultFallbackMessage(input: {
    lessonName: string;
    failReason: string;
    prepCompletionRate: number;
    prepAvgStress: number;
    prepDelayCount: number;
    sleptWellBeforeExam: boolean | null;
  }): string {
    const completion = Math.round(input.prepCompletionRate * 100);
    if (
      input.failReason === 'poor_sleep_before' ||
      input.sleptWellBeforeExam === false
    ) {
      return `${input.lessonName} için sonucu etkileyen ana sinyal uyku görünüyor. Bir sonraki sınavda son geceyi toparlamak, hazırlığın kadar performansını da korumana yardımcı olur.`;
    }
    if (input.failReason === 'exam_anxiety' || input.prepAvgStress >= 4) {
      return `${input.lessonName} için hazırlık kadar sınav anındaki stres de belirleyici olmuş olabilir. Bir sonraki sefer hedefin sadece daha çok çalışmak değil, sınav öncesi baskıyı daha yönetilebilir tutmak olsun.`;
    }
    if (input.failReason === 'time_management_in_exam') {
      return `${input.lessonName} için konu bilgisiyle birlikte sınav içi tempo da önemli görünüyor. Bir sonraki sınavda soruları önceliklendirme ve süreyi bölme pratiği sonucu iyileştirebilir.`;
    }
    if (input.failReason === 'lack_of_focus' || input.prepDelayCount > 0) {
      return `${input.lessonName} hazırlığında odak ve süreklilik zorlamış olabilir. Kısa ama bölünmeyen çalışma anları, bir sonraki sınavda tamamladığın emeğin daha net karşılık bulmasına yardım eder.`;
    }
    if (input.failReason === 'poor_understanding') {
      return `${input.lessonName} için sorun sadece süre değil, konunun oturma biçimi olabilir. Bir sonraki hazırlıkta yanlış yaptığın başlıkları erken fark etmek ve temel kavramları tekrar kurmak daha iyi sonuç verir.`;
    }
    if (input.failReason === 'overwhelmed_by_workload') {
      return `${input.lessonName} sonucu genel yükten etkilenmiş olabilir. Sistem bu bilgiyi sonraki planlarda yük dengesini yorumlamak için kullanacak.`;
    }
    return `${input.lessonName} için hazırlık tamamlama oranın yaklaşık %${completion}. Bu sonucu bir veri noktası olarak kullanıp sonraki sınavda hangi çalışma biçiminin daha iyi işlediğini daha net görebiliriz.`;
  }

  // ── OpenRouter call ───────────────────────────────────────────────────────

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
        console.error(
          `[AC] OpenRouter hata yanıtı:`,
          JSON.stringify(data).substring(0, 200),
        );
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

  private toLocalDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
