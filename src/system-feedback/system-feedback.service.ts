import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentTime } from '../utils/time.util';
import { buildSystemFeedbackPrompt } from './ai-prompt';

@Injectable()
export class SystemFeedbackService {
  constructor(private prisma: PrismaService) {}

  async getMessages(userId: number) {
    const plannerContext:
      | { burnoutDetected?: boolean; programZorlastu?: boolean }
      | undefined = undefined;
    const now = getCurrentTime();

    type SuggestedConstraint =
      | { kind: 'bool'; type: string; question: string }
      | { kind: 'hour_end' | 'hour_start'; type: string; question: string; options: number[] }
      | { kind: 'time_of_day'; type: string; question: string; dayOfWeek: number; dayName: string };

    const messages: Array<{
      type: string;
      message: string;
      suggestion: string;
      confidence?: number;
      suggestedConstraint?: SuggestedConstraint;
    }> = [];
    const examResultReminderLessons: string[] = [];
    let overridesWritten = 0;

    // ── Fetch data ────────────────────────────────────────────────────────────
    const recentFeedbacks = await this.prisma.weeklyFeedback.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
      take: 3,
      include: { lessonFeedbacks: true },
    });

    const lessons = await this.prisma.lesson.findMany({
      where: { userId },
      include: { exams: { include: { results: true } } },
    });

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    const recentChecklists = await this.prisma.dailyChecklist.findMany({
      where: {
        userId,
        date: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { items: true },
      orderBy: { date: 'desc' },
    });

    const weekStart = this.getWeekStart(now);

    const scheduledThisWeek = await this.prisma.scheduledBlock.findMany({
      where: { userId, weekStart },
    });

    console.log(`[SF] userId=${userId} now=${now.toISOString().substring(0, 10)}`);
    console.log(`[SF] feedbacks=${recentFeedbacks.length} lessons=${lessons.length} checklists=${recentChecklists.length} thisWeekBlocks=${scheduledThisWeek.length}`);
    if (profile)
      console.log(`[SF] completion7d=${(profile.completionRate7d * 100).toFixed(0)}% stress7d=${profile.avgStress7d.toFixed(1)}`);

    const lastFeedback = recentFeedbacks[0] ?? null;

    // ── Post-exam result reminder ─────────────────────────────────────────────
    const todayStr = this.toLocalDateStr(now);
    for (const lesson of lessons) {
      for (const exam of lesson.exams) {
        const examDate = new Date(exam.examDate);
        const dayAfterExam = new Date(examDate);
        dayAfterExam.setDate(dayAfterExam.getDate() + 1);
        if (this.toLocalDateStr(dayAfterExam) !== todayStr) continue;
        const hasResult = exam.results.some((r) => r.userId === userId);
        if (hasResult) continue;
        console.log(`[SF] ✓ sinav_sonucu_gir -> ${lesson.name}`);
        examResultReminderLessons.push(lesson.name);
      }
    }

    // ── S4: Wants more time but can't complete ────────────────────────────────
    if (lastFeedback) {
      const needsMoreTimeLessons = lastFeedback.lessonFeedbacks.filter((lf) => lf.needsMoreTime === 1);
      const lessonMap = new Map(lessons.map((l) => [l.id, l]));

      for (const lf of needsMoreTimeLessons) {
        const lesson = lessonMap.get(lf.lessonId);
        if (!lesson) continue;

        let lessonPlanned = 0, lessonCompleted = 0;
        for (const checklist of recentChecklists) {
          for (const item of checklist.items) {
            if (item.lessonId !== lesson.id) continue;
            lessonPlanned += item.plannedBlocks;
            lessonCompleted += item.completedBlocks;
          }
        }

        if (lessonPlanned < 2) continue;
        const lessonCompletion = lessonCompleted / lessonPlanned;

        if (lessonCompletion < 0.55) {
          if (!(await this.isOnCooldown(userId, 'sure_isteme_ama_tamamlayamama', lf.lessonId))) {
            // Confidence: data = planned blocks, signal = how far below 55% threshold
            const confidence = this.calcConfidence({
              dataPoints: lessonPlanned,
              minDataPoints: 4,
              signalStrength: Math.min(1, (0.55 - lessonCompletion) / 0.55),
            });
            console.log(`[SF] ✓ sure_isteme_ama_tamamlayamama -> ${lesson.name} (completion=%${Math.round(lessonCompletion * 100)} confidence=${Math.round(confidence * 100)}%)`);
            messages.push({
              type: 'sure_isteme_ama_tamamlayamama',
              message: `You requested more time for ${lesson.name}, but completion is still at ${Math.round(lessonCompletion * 100)}% — extra blocks have been added but aren't being finished.`,
              suggestion: `More time alone may not be the issue — difficulty or focus could be the real barrier. The extra blocks are there; try starting with just one.`,
              confidence,
            });
            await this.logFeedback(userId, 'sure_isteme_ama_tamamlayamama', lf.lessonId);
          } else {
            console.log(`[SF] ⏭ sure_isteme_ama_tamamlayamama -> ${lesson.name} (cooldown)`);
          }
        }
      }
    }

    // ── S5 & S6: Exam approaching ─────────────────────────────────────────────
    const blocksPerLesson: Record<number, number> = {};
    for (const block of scheduledThisWeek) {
      blocksPerLesson[block.lessonId] = (blocksPerLesson[block.lessonId] ?? 0) + block.blockCount;
    }

    for (const lesson of lessons) {
      const daysLeft = this.daysUntilExam(lesson, now);
      if (daysLeft === null || daysLeft > 7) continue;

      const allocatedBlocks = blocksPerLesson[lesson.id] ?? 0;
      let lessonPlanned = 0;
      let lessonCompleted = 0;
      for (const checklist of recentChecklists) {
        for (const item of checklist.items) {
          if (item.lessonId !== lesson.id) continue;
          lessonPlanned += item.plannedBlocks;
          lessonCompleted += item.completedBlocks;
        }
      }

      if (lessonPlanned >= 2 && lessonCompleted / lessonPlanned < 0.6) {
        if (!(await this.isOnCooldown(userId, 'sinav_az_calisma', lesson.id))) {
          // Confidence: urgency from daysLeft + how incomplete it is
          const completionRate = lessonCompleted / lessonPlanned;
          const urgency = Math.min(1, (7 - daysLeft) / 6); // closer = higher urgency
          const confidence = this.calcConfidence({
            dataPoints: lessonPlanned,
            minDataPoints: 3,
            signalStrength: (1 - completionRate) * 0.7 + urgency * 0.3,
          });
          console.log(`[SF] ✓ sinav_az_calisma -> ${lesson.name} (${daysLeft}g kaldi, %${Math.round(completionRate * 100)} tamamlandi confidence=${Math.round(confidence * 100)}%)`);
          messages.push({
            type: 'sinav_az_calisma',
            message: `${lesson.name} exam is ${daysLeft} days away, but most sessions are incomplete — this lesson is at risk.`,
            suggestion: 'Prioritise this lesson in the remaining days.',
            confidence,
          });
          await this.logFeedback(userId, 'sinav_az_calisma', lesson.id);
          await this.writeReviewBlockOverride(userId, lesson.id, weekStart);
          overridesWritten++;
        } else {
          console.log(`[SF] ⏭ sinav_az_calisma -> ${lesson.name} (cooldown)`);
        }
        continue;
      }

      if (allocatedBlocks < 4) {
        if (!(await this.isOnCooldown(userId, 'sinav_az_blok', lesson.id))) {
          // Confidence: fewer blocks + closer exam = higher confidence
          const blockShortfall = Math.min(1, (4 - allocatedBlocks) / 4);
          const urgency = Math.min(1, (7 - daysLeft) / 6);
          const confidence = this.calcConfidence({
            dataPoints: daysLeft <= 3 ? 3 : 2,
            minDataPoints: 2,
            signalStrength: blockShortfall * 0.6 + urgency * 0.4,
          });
          console.log(`[SF] ✓ sinav_az_blok -> ${lesson.name} (${daysLeft}g kaldi, ${allocatedBlocks} blok confidence=${Math.round(confidence * 100)}%)`);
          messages.push({
            type: 'sinav_az_blok',
            message: `${lesson.name} exam is ${daysLeft} days away, but only ${allocatedBlocks} block(s) could be allocated this week.`,
            suggestion:
              allocatedBlocks === 0
                ? "Update your availability and I'll reschedule."
                : "Keep other lessons' blocks short and prioritise this one.",
            confidence,
          });
          await this.logFeedback(userId, 'sinav_az_blok', lesson.id);
          await this.writePriorityOverride(userId, lesson.id, weekStart, 3);
          overridesWritten++;
        } else {
          console.log(`[SF] ⏭ sinav_az_blok -> ${lesson.name} (cooldown)`);
        }
      }
    }

    // ── T3: Two consecutive heavy weeks ──────────────────────────────────────
    if (recentFeedbacks.length >= 2) {
      const last2 = recentFeedbacks.slice(0, 2);
      if (last2.every((f) => f.weekloadFeedback === 'cok_yogundu')) {
        if (!(await this.isOnCooldown(userId, 'asiri_yuk'))) {
          // Confidence: 2 weeks = baseline, 3 weeks = strong signal
          const repeatWeeks = recentFeedbacks.filter((f) => f.weekloadFeedback === 'cok_yogundu').length;
          const confidence = this.calcConfidence({
            dataPoints: repeatWeeks,
            minDataPoints: 2,
            signalStrength: 0.9,
            repeatWeeks,
          });
          console.log(`[SF] ✓ asiri_yuk (repeatWeeks=${repeatWeeks} confidence=${Math.round(confidence * 100)}%)`);
          messages.push({
            type: 'asiri_yuk',
            message: 'Your schedule has felt too heavy for two weeks in a row. Next week has been automatically lightened by 15%.',
            suggestion: 'Consider reviewing your busy-time slots.',
            confidence,
          });
          await this.logFeedback(userId, 'asiri_yuk');
        } else {
          console.log(`[SF] ⏭ asiri_yuk (cooldown)`);
        }
      }
    }

    // ── Frequent delays ───────────────────────────────────────────────────────
    for (const lesson of lessons) {
      if (lesson.keyfiDelayCount >= 2) {
        if (!(await this.isOnCooldown(userId, 'sik_erteleme', lesson.id))) {
          // Confidence: more delays = stronger signal, caps at 5
          const confidence = this.calcConfidence({
            dataPoints: lesson.keyfiDelayCount,
            minDataPoints: 2,
            signalStrength: Math.min(1, lesson.keyfiDelayCount / 5),
          });
          console.log(`[SF] ✓ sik_erteleme -> ${lesson.name} (${lesson.keyfiDelayCount}x confidence=${Math.round(confidence * 100)}%)`);
          messages.push({
            type: 'sik_erteleme',
            message: `${lesson.name} has been delayed multiple times — the planner has switched it to slot mode.`,
            suggestion:
              'The planner has switched this lesson to slot mode — it now gets a guaranteed spot every few days instead of being scheduled flexibly. Try to complete at least one of those fixed sessions this week.',
            confidence,
            suggestedConstraint: {
              kind: 'bool',
              type: 'disable_slotted_mode',
              question: 'Slotlu modu kapatayım mı?',
            },
          });
          await this.logFeedback(userId, 'sik_erteleme', lesson.id);
        } else {
          console.log(`[SF] ⏭ sik_erteleme -> ${lesson.name} (cooldown)`);
        }
      }
    }

    // ── High stress ───────────────────────────────────────────────────────────
    const last3Checklists = recentChecklists.slice(0, 3);
    if (last3Checklists.length >= 3 && last3Checklists.every((c) => c.stressLevel >= 4)) {
      if (!(await this.isOnCooldown(userId, 'yuksek_stres'))) {
        const avgStressLevel = last3Checklists.reduce((s, c) => s + c.stressLevel, 0) / 3;
        // Confidence: how far above threshold (4) and how many days
        const confidence = this.calcConfidence({
          dataPoints: last3Checklists.length,
          minDataPoints: 3,
          signalStrength: Math.min(1, (avgStressLevel - 3) / 2),
        });
        console.log(`[SF] ✓ yuksek_stres (levels: ${last3Checklists.map((c) => c.stressLevel).join(',')} confidence=${Math.round(confidence * 100)}%)`);

        const asiriYukFired = messages.some((m) => m.type === 'asiri_yuk');

        let yorucuDayCompletion = 0;
        if (!asiriYukFired) {
          const userBusySlots = await this.prisma.userBusySlot.findMany({ where: { userId } });
          const yorucuDows = new Set(
            userBusySlots
              .filter((s) => s.fatigueLevel >= 4)
              .map((s) => s.dayOfWeek),
          );
          if (yorucuDows.size > 0) {
            let planned = 0, completed = 0;
            for (const checklist of recentChecklists) {
              const dow = new Date(checklist.date).getDay();
              const localDow = dow === 0 ? 7 : dow;
              if (!yorucuDows.has(localDow)) continue;
              for (const item of checklist.items) {
                planned += item.plannedBlocks;
                completed += item.completedBlocks;
              }
            }
            yorucuDayCompletion = planned > 0 ? completed / planned : 0;
            console.log(`[SF] yorucu gun completion=${(yorucuDayCompletion * 100).toFixed(0)}%`);
          }
        }

        const suggestedConstraint: (typeof messages)[0]['suggestedConstraint'] = asiriYukFired
          ? { kind: 'bool', type: 'allow_consecutive_agir', question: 'Zor dersleri art arda gruplayalım mı?' }
          : undefined;

        messages.push({
          type: 'yuksek_stres',
          message: 'Your stress level has been high (≥4) for 3 days in a row.',
          suggestion: 'Consider reviewing your workload or planning a lighter week.',
          confidence,
          ...(suggestedConstraint ? { suggestedConstraint } : {}),
        });
        await this.logFeedback(userId, 'yuksek_stres');
      } else {
        console.log(`[SF] ⏭ yuksek_stres (cooldown)`);
      }
    }

    // ── Inactivity ────────────────────────────────────────────────────────────
    const last2Checklists = recentChecklists.slice(0, 2);
    if (
      last2Checklists.length >= 2 &&
      last2Checklists.every(
        (c) => c.items.reduce((sum, item) => sum + item.completedBlocks, 0) === 0,
      )
    ) {
      if (!(await this.isOnCooldown(userId, 'hareketsizlik'))) {
        // Confidence: 2 days minimum, signal is binary (0 completion)
        const confidence = this.calcConfidence({
          dataPoints: last2Checklists.length,
          minDataPoints: 2,
          signalStrength: 0.85,
        });
        console.log(`[SF] ✓ hareketsizlik (confidence=${Math.round(confidence * 100)}%)`);
        messages.push({
          type: 'hareketsizlik',
          message: 'No study blocks have been completed in the last 2 days.',
          suggestion: 'Try starting with a short session today — even 30 minutes makes a difference.',
          confidence,
          suggestedConstraint: {
            kind: 'hour_start',
            type: 'study_start_hour',
            question: 'Bloklar çok erken mi başlıyor? Ne zaman çalışabilirsin?',
            options: [9, 10, 11, 12],
          },
        });
        await this.logFeedback(userId, 'hareketsizlik');
      } else {
        console.log(`[SF] ⏭ hareketsizlik (cooldown)`);
      }
    }

    // ── Exam intensity forecast ───────────────────────────────────────────────
    const upcomingExams: { lessonName: string; daysLeft: number; difficulty: number }[] = [];
    for (const lesson of lessons) {
      for (const exam of lesson.exams) {
        const daysLeft = Math.ceil(
          (new Date(exam.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysLeft >= 0 && daysLeft <= 7) {
          upcomingExams.push({ lessonName: lesson.name, daysLeft, difficulty: lesson.difficulty });
        }
      }
    }

    const examDays = new Set(upcomingExams.map((e) => e.daysLeft));
    let consecutiveDays = 0;
    let prevDay = -2;
    for (const day of [...examDays].sort((a, b) => a - b)) {
      if (day === prevDay + 1) consecutiveDays++;
      prevDay = day;
    }
    let examIntensityScore = 0;
    for (const exam of upcomingExams) {
      examIntensityScore += exam.difficulty * (consecutiveDays > 0 ? 1.3 : 1);
    }

    if (upcomingExams.length > 0) {
      console.log(`[SF] sinav_yogunlugu: ${upcomingExams.length} sinav score=${examIntensityScore.toFixed(1)}`);
    }

    if (examIntensityScore >= 9) {
      const examList = upcomingExams.map((e) => `${e.lessonName} (${e.daysLeft}d)`).join(', ');
      if (!(await this.isOnCooldown(userId, 'sinav_yogunlugu_kritik'))) {
        // Confidence: score well above threshold, exam data is objective
        const confidence = this.calcConfidence({
          dataPoints: upcomingExams.length,
          minDataPoints: 1,
          signalStrength: Math.min(1, examIntensityScore / 15),
        });
        console.log(`[SF] ✓ sinav_yogunlugu_kritik (confidence=${Math.round(confidence * 100)}%)`);
        messages.push({
          type: 'sinav_yogunlugu_kritik',
          message: `Critical exam week ahead: ${examList}. These are very close — now is the time to focus.`,
          suggestion: 'Your exam lessons are the priority right now. Everything else can wait.',
          confidence,
        });
        await this.logFeedback(userId, 'sinav_yogunlugu_kritik');
      } else {
        console.log(`[SF] ⏭ sinav_yogunlugu_kritik (cooldown)`);
      }
    } else if (examIntensityScore >= 6) {
      const examList = upcomingExams.map((e) => `${e.lessonName} (${e.daysLeft}d)`).join(', ');
      if (!(await this.isOnCooldown(userId, 'sinav_yogunlugu_yogun'))) {
        const confidence = this.calcConfidence({
          dataPoints: upcomingExams.length,
          minDataPoints: 1,
          signalStrength: Math.min(1, examIntensityScore / 12),
        });
        console.log(`[SF] ✓ sinav_yogunlugu_yogun (confidence=${Math.round(confidence * 100)}%)`);
        messages.push({
          type: 'sinav_yogunlugu_yogun',
          message: `A heavy week is coming up: ${examList}. Time to shift focus toward your exam lessons.`,
          suggestion: 'Give extra attention to your exam lessons this week — other topics can stay light.',
          confidence,
        });
        await this.logFeedback(userId, 'sinav_yogunlugu_yogun');
      } else {
        console.log(`[SF] ⏭ sinav_yogunlugu_yogun (cooldown)`);
      }
    } else if (examIntensityScore >= 3) {
      if (!(await this.isOnCooldown(userId, 'sinav_yogunlugu_orta'))) {
        const confidence = this.calcConfidence({
          dataPoints: upcomingExams.length,
          minDataPoints: 1,
          signalStrength: Math.min(1, examIntensityScore / 8),
        });
        console.log(`[SF] ✓ sinav_yogunlugu_orta (confidence=${Math.round(confidence * 100)}%)`);
        messages.push({
          type: 'sinav_yogunlugu_orta',
          message: `You have ${upcomingExams.length} exam(s) coming up this week. Start preparing now if you haven't already.`,
          suggestion: 'A bit of extra focus on your exam lessons now will make a real difference later.',
          confidence,
        });
        await this.logFeedback(userId, 'sinav_yogunlugu_orta');
      } else {
        console.log(`[SF] ⏭ sinav_yogunlugu_orta (cooldown)`);
      }
    }

    // ── Schedule load forecast ────────────────────────────────────────────────
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    const nextWeekBlocks = await this.prisma.scheduledBlock.findMany({
      where: { userId, weekStart: nextWeekStart },
    });
    const nextWeekTotalBlocks = nextWeekBlocks.reduce((sum, b) => sum + b.blockCount, 0);

    if (nextWeekTotalBlocks > 0 && profile) {
      const thisWeekTotal = scheduledThisWeek.reduce((sum, b) => sum + b.blockCount, 0);
      const avgCapacity = profile.completionRate7d * (thisWeekTotal || nextWeekTotalBlocks);
      const capacityRatio = avgCapacity > 0 ? nextWeekTotalBlocks / avgCapacity : 1;

      console.log(`[SF] program_yogunlugu: nextWeek=${nextWeekTotalBlocks} avgCapacity=${avgCapacity.toFixed(1)} ratio=${capacityRatio.toFixed(2)}`);

      if (capacityRatio > 1.25) {
        if (!(await this.isOnCooldown(userId, 'program_yogunlugu_asim'))) {
          // Confidence: how far above capacity threshold
          const confidence = this.calcConfidence({
            dataPoints: Math.round(profile.completionRate7d * 10),
            minDataPoints: 5,
            signalStrength: Math.min(1, (capacityRatio - 1) / 1.5),
          });
          console.log(`[SF] ✓ program_yogunlugu_asim (%${Math.round((capacityRatio - 1) * 100)} fazla confidence=${Math.round(confidence * 100)}%)`);
          messages.push({
            type: 'program_yogunlugu_asim',
            message: `Next week's schedule is ${Math.round((capacityRatio - 1) * 100)}% above your recent average capacity — some blocks may go unfinished.`,
            suggestion: 'This is a heads-up, not a change. If the week feels too heavy, your feedback after it will help the system adjust.',
            confidence,
          });
          await this.logFeedback(userId, 'program_yogunlugu_asim');
        } else {
          console.log(`[SF] ⏭ program_yogunlugu_asim (cooldown)`);
        }
      } else if (capacityRatio < 0.85) {
        if (!(await this.isOnCooldown(userId, 'program_yogunlugu_dusuk'))) {
          const confidence = this.calcConfidence({
            dataPoints: Math.round(profile.completionRate7d * 10),
            minDataPoints: 5,
            signalStrength: Math.min(1, (1 - capacityRatio) / 0.5),
          });
          console.log(`[SF] ✓ program_yogunlugu_dusuk (confidence=${Math.round(confidence * 100)}%)`);
          messages.push({
            type: 'program_yogunlugu_dusuk',
            message: "Next week looks lighter than usual — a good window to catch up on anything you've fallen behind on.",
            suggestion: 'Light weeks are valuable. Use the extra headroom to consolidate rather than coast.',
            confidence,
          });
          await this.logFeedback(userId, 'program_yogunlugu_dusuk');
        } else {
          console.log(`[SF] ⏭ program_yogunlugu_dusuk (cooldown)`);
        }
      }
    }

    // ── Combined alerts ───────────────────────────────────────────────────────
    const hasYogunHafta = messages.some(
      (m) =>
        m.type === 'sinav_yogunlugu_kritik' ||
        m.type === 'sinav_yogunlugu_yogun' ||
        m.type === 'program_yogunlugu_asim',
    );
    const hasYuksekStres = messages.some((m) => m.type === 'yuksek_stres');
    const hasYuksekDelay = messages.filter((m) => m.type === 'sik_erteleme').length >= 2;

    if (hasYogunHafta && hasYuksekStres) {
      if (!(await this.isOnCooldown(userId, 'kombine_yogun_stres'))) {
        // Combined signals = higher confidence than either alone
        const baseConf = Math.max(
          messages.find((m) => m.type === 'yuksek_stres')?.confidence ?? 0.5,
          messages.find((m) => hasYogunHafta)?.confidence ?? 0.5,
        );
        const confidence = Math.min(1, baseConf + 0.15);
        console.log(`[SF] ✓ kombine_yogun_stres (confidence=${Math.round(confidence * 100)}%)`);
        messages.push({
          type: 'kombine_yogun_stres',
          message: 'Your schedule is heavy and your stress is high at the same time. This combination can seriously hurt your learning.',
          suggestion: "Shorten today's study blocks — rescheduling is critical.",
          confidence,
        });
        await this.logFeedback(userId, 'kombine_yogun_stres');
      } else {
        console.log(`[SF] ⏭ kombine_yogun_stres (cooldown)`);
      }
    }

    if (hasYogunHafta && hasYuksekDelay) {
      if (!(await this.isOnCooldown(userId, 'kombine_yogun_erteleme'))) {
        const baseConf = messages
          .filter((m) => m.type === 'sik_erteleme')
          .reduce((max, m) => Math.max(max, m.confidence ?? 0), 0);
        const confidence = Math.min(1, baseConf + 0.1);
        console.log(`[SF] ✓ kombine_yogun_erteleme (confidence=${Math.round(confidence * 100)}%)`);
        messages.push({
          type: 'kombine_yogun_erteleme',
          message: 'A heavy week is ahead and your delay rate has historically increased under this kind of load.',
          suggestion: 'The planner is already aware of this pattern — it has prioritised your delayed lessons. Try to honour at least one session for each.',
          confidence,
        });
        await this.logFeedback(userId, 'kombine_yogun_erteleme');
      } else {
        console.log(`[SF] ⏭ kombine_yogun_erteleme (cooldown)`);
      }
    }

    // ── Sleep & stress trigger ────────────────────────────────────────────────
    const recentSleep = await this.prisma.dailyChecklist.findMany({
      where: {
        userId,
        date: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        sleptWell: { not: null },
      },
      orderBy: { date: 'desc' },
      select: { date: true, sleptWell: true, stressLevel: true },
    });

    if (recentSleep.length >= 2) {
      const badSleepDays = recentSleep.filter((l) => l.sleptWell === false);
      const avgStress = profile?.avgStress7d ?? 3;

      if (badSleepDays.length >= 2 && avgStress >= 3.5) {
        if (!(await this.isOnCooldown(userId, 'dusuk_uyku_stres'))) {
          const goodComp = profile?.goodSleepCompletionRate;
          const badComp = profile?.badSleepCompletionRate;
          const goodStress = profile?.goodSleepAvgStress;
          const badStress = profile?.badSleepAvgStress;

          // Confidence: stronger if we have sleep correlation data
          const hasCorrelationData = goodComp != null && badComp != null;
          const compDiffSignal = hasCorrelationData
            ? Math.min(1, Math.abs((goodComp! - badComp!) * 2))
            : 0.5;
          const confidence = this.calcConfidence({
            dataPoints: badSleepDays.length + (hasCorrelationData ? 3 : 0),
            minDataPoints: 3,
            signalStrength: compDiffSignal * 0.6 + Math.min(1, (avgStress - 3) / 2) * 0.4,
          });

          let message = 'Your sleep has been irregular lately and your stress is running high.';
          let suggestion = "Try to stabilise your sleep first — it's the foundation of study performance.";

          if (goodComp !== null && goodComp !== undefined && badComp !== null && badComp !== undefined) {
            const compDiff = Math.round((goodComp - badComp) * 100);
            if (compDiff >= 15) {
              message = `Your completion rate drops by ${compDiff}% on poor-sleep days — sleep directly affects your productivity.`;
            }
          }
          if (goodStress !== null && goodStress !== undefined && badStress !== null && badStress !== undefined) {
            const stressDiff = (badStress - goodStress).toFixed(1);
            if (parseFloat(stressDiff) >= 0.8) {
              suggestion = `Your stress is ${stressDiff} points lower on good-sleep days. Make consistent sleep your top priority this week.`;
            }
          }

          console.log(`[SF] ✓ dusuk_uyku_stres (badSleep=${badSleepDays.length}/3 stress=${avgStress.toFixed(1)} goodComp=${goodComp?.toFixed(2) ?? '-'} badComp=${badComp?.toFixed(2) ?? '-'} confidence=${Math.round(confidence * 100)}%)`);
          messages.push({
            type: 'dusuk_uyku_stres',
            message,
            suggestion,
            confidence,
            suggestedConstraint: {
              kind: 'hour_end',
              type: 'study_end_hour',
              question: 'Kaç\'a kadar çalışmak istersin?',
              options: [20, 21, 22],
            },
          });
          await this.logFeedback(userId, 'dusuk_uyku_stres');
        } else {
          console.log(`[SF] ⏭ dusuk_uyku_stres (cooldown)`);
        }
      }
    }

    // ── DOW analizi → day_study_time önerisi ─────────────────────────────────
    if (profile) {
      const dowRates: number[] = JSON.parse(profile.dowCompletionRates ?? '[0,0,0,0,0,0,0]');
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      for (let i = 0; i < 7; i++) {
        if (dowRates[i] > 0 && dowRates[i] < 0.4) {
          const dow = i + 1;
          const cooldownKey = `day_study_time_suggestion_dow${dow}`;
          if (!(await this.isOnCooldown(userId, cooldownKey))) {
            // Confidence: how consistently low (how far below 40%)
            const confidence = this.calcConfidence({
              dataPoints: recentChecklists.filter((c) => {
                const d = new Date(c.date).getDay();
                return (d === 0 ? 7 : d) === dow;
              }).length,
              minDataPoints: 2,
              signalStrength: Math.min(1, (0.4 - dowRates[i]) / 0.4),
            });
            console.log(`[SF] ✓ dow_dusuk_completion -> ${dayNames[i]} (${(dowRates[i] * 100).toFixed(0)}% confidence=${Math.round(confidence * 100)}%)`);
            messages.push({
              type: 'dow_dusuk_completion',
              message: `${dayNames[i]} sessions are consistently incomplete — completion is at ${Math.round(dowRates[i] * 100)}%.`,
              suggestion: `Try a different time slot on ${dayNames[i]} — your current preferred time may not suit this day.`,
              confidence,
              suggestedConstraint: {
                kind: 'time_of_day',
                type: 'day_study_time',
                question: `${dayNames[i]} için farklı bir çalışma saati deneyelim mi?`,
                dayOfWeek: dow,
                dayName: dayNames[i],
              },
            });
            await this.logFeedback(userId, cooldownKey);
            break;
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    const now_iso = now.toISOString();
    for (const msg of messages) {
      (msg as any).triggeredAt = now_iso;
    }

    console.log(`[SF] SONUC: ${messages.length} mesaj → [${messages.map((m) => m.type).join(', ')}]`);

    const insightAnswers = await this.getRecentInsightAnswers(userId);
    const aiMessage = await this.buildAiMessage(messages, profile, lastFeedback?.weekloadFeedback ?? null, insightAnswers);
    const examResultMessage = this.buildExamResultReminderMessage(examResultReminderLessons);
    console.log(`[SF] AI: ${aiMessage ? 'uretildi' : 'bos'}`);
    return { messages, aiMessage, examResultMessage, overridesWritten };
  }

  // ── Confidence calculator ─────────────────────────────────────────────────

  private calcConfidence(params: {
    dataPoints: number;
    minDataPoints: number;
    signalStrength: number;
    repeatWeeks?: number;
  }): number {
    const { dataPoints, minDataPoints, signalStrength, repeatWeeks = 1 } = params;
    const dataScore = Math.min(1, dataPoints / minDataPoints);
    const repeatBonus = Math.min(0.2, (repeatWeeks - 1) * 0.1);
    return Math.min(1, dataScore * signalStrength + repeatBonus);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async writeReviewBlockOverride(userId: number, lessonId: number, weekStart: Date): Promise<void> {
    await this.prisma.lessonPlanOverride.upsert({
      where: { userId_lessonId_weekStart: { userId, lessonId, weekStart } },
      create: { userId, lessonId, weekStart, addReviewBlock: true },
      update: { addReviewBlock: true },
    });
    console.log(`[SF] override yazildi: lessonId=${lessonId} addReviewBlock=true`);
  }

  private async writePriorityOverride(userId: number, lessonId: number, weekStart: Date, priorityBoost: number): Promise<void> {
    await this.prisma.lessonPlanOverride.upsert({
      where: { userId_lessonId_weekStart: { userId, lessonId, weekStart } },
      create: { userId, lessonId, weekStart, priorityBoost },
      update: { priorityBoost },
    });
    console.log(`[SF] override yazildi: lessonId=${lessonId} priorityBoost=+${priorityBoost}`);
  }

  private readonly cooldownHours: Record<string, number> = {
    sure_isteme_ama_tamamlayamama:   168,
    sinav_az_calisma:                24,
    sinav_az_blok:                   168,
    asiri_yuk:                       168,
    sik_erteleme:                    48,
    yuksek_stres:                    24,
    hareketsizlik:                   24,
    sinav_yogunlugu_kritik:          24,
    sinav_yogunlugu_yogun:           48,
    sinav_yogunlugu_orta:            168,
    program_yogunlugu_asim:          168,
    program_yogunlugu_dusuk:         168,
    kombine_yogun_stres:             24,
    kombine_yogun_erteleme:          168,
    dusuk_uyku_stres:                24,
    sinav_sonucu_gir:                24,
    day_study_time_suggestion_dow1:  168,
    day_study_time_suggestion_dow2:  168,
    day_study_time_suggestion_dow3:  168,
    day_study_time_suggestion_dow4:  168,
    day_study_time_suggestion_dow5:  168,
    day_study_time_suggestion_dow6:  168,
    day_study_time_suggestion_dow7:  168,
  };

  private async isOnCooldown(userId: number, type: string, lessonId?: number): Promise<boolean> {
    const hours = this.cooldownHours[type] ?? 48;
    const since = new Date(getCurrentTime().getTime() - hours * 60 * 60 * 1000);
    const log = await this.prisma.systemFeedbackLog.findFirst({
      where: {
        userId,
        type,
        lessonId: lessonId ?? null,
        triggeredAt: { gte: since },
      },
    });
    return !!log;
  }

  private async logFeedback(userId: number, type: string, lessonId?: number): Promise<void> {
    await this.prisma.systemFeedbackLog.create({
      data: {
        userId,
        type,
        lessonId: lessonId ?? null,
        triggeredAt: getCurrentTime(),
      },
    });
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private toLocalDateStr(date: Date): string {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private buildExamResultReminderMessage(lessonNames: string[]): string {
    const uniqueNames = [...new Set(lessonNames)];
    if (uniqueNames.length === 0) return '';
    const visible = uniqueNames.slice(0, 2).join(', ');
    const extra = uniqueNames.length > 2 ? ` ve ${uniqueNames.length - 2} ders daha` : '';
    return `${visible}${extra} sınav sonucunu Profil'den girebilirsin. Böylece performansını daha iyi yorumlayabiliriz.`;
  }

  private async buildAiMessage(
    messages: Array<{ type: string; message: string; suggestion: string }>,
    profile: { completionRate7d: number; avgStress7d: number; consistencyScore: number } | null,
    lastWeekloadFeedback?: string | null,
    insightAnswers?: Array<{ questionType: string; answer: string; lessonId?: number | null }>,
  ): Promise<string> {
    if (messages.length === 0) return '';

    const prompt = buildSystemFeedbackPrompt({
      triggeredMessages: messages,
      studentProfile: profile,
      lastWeekloadFeedback: (lastWeekloadFeedback as any) ?? null,
      burnoutDetected: false,
      programZorlastu: false,
      insightAnswers: insightAnswers ?? [],
    });
    if (!prompt) return '';

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn('[SF] OPENROUTER_API_KEY bulunamadi');
      return '';
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b:free',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
console.log(`[SF] OpenRouter response:`, JSON.stringify(data).substring(0, 300));
      console.log(`[SF] OpenRouter status=${response.status}`);
      const text = data?.choices?.[0]?.message?.content?.trim() ?? '';
      if (text) console.log(`[SF] AI mesaj: ${text.substring(0, 120)}...`);
      return text;
    } catch (err) {
      console.error('[SF] OpenRouter hatasi:', err);
      return '';
    }
  }

  async saveInsightAnswer(
    userId: number,
    questionType: string,
    answer: string,
    lessonId?: number,
  ): Promise<void> {
    await this.prisma.insightAnswer.create({
      data: { userId, questionType, answer, lessonId: lessonId ?? null },
    });
    console.log(`[SF] insight cevap kaydedildi: userId=${userId} type=${questionType} answer="${answer}"`);
  }

  async getRecentInsightAnswers(userId: number): Promise<Array<{ questionType: string; answer: string; lessonId?: number | null }>> {
    const since = new Date(getCurrentTime().getTime() - 14 * 24 * 60 * 60 * 1000);
    return this.prisma.insightAnswer.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { questionType: true, answer: true, lessonId: true },
    });
  }

  private daysUntilExam(lesson: { exams: Array<{ examDate: Date }> }, now: Date): number | null {
    if (lesson.exams.length === 0) return null;
    const future = lesson.exams
      .map((e) => Math.ceil((new Date(e.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      .filter((d) => d >= 0);
    return future.length > 0 ? Math.min(...future) : null;
  }
}