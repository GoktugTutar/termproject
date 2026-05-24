import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentTime } from '../utils/time.util';
import { buildSystemFeedbackPrompt } from './ai-prompt';

@Injectable()
export class SystemFeedbackService {
  constructor(private prisma: PrismaService) {}

  async getMessages(userId: number) {
    const plannerContext: { burnoutDetected?: boolean; programZorlastu?: boolean } | undefined = undefined;
    const now = getCurrentTime();
    const messages: Array<{ type: string; message: string; suggestion: string }> = [];
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
      include: { exams: true },
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
    if (profile) console.log(`[SF] completion7d=${(profile.completionRate7d * 100).toFixed(0)}% stress7d=${profile.avgStress7d.toFixed(1)}`);

    const lastFeedback = recentFeedbacks[0] ?? null;

    // ── S4: Wants more time but can't complete (lesson-level completion check) ──
    if (lastFeedback) {
      const needsMoreTimeLessons = lastFeedback.lessonFeedbacks.filter((lf) => lf.needsMoreTime === 1);
      const lessonMap = new Map(lessons.map((l) => [l.id, l]));

      for (const lf of needsMoreTimeLessons) {
        const lesson = lessonMap.get(lf.lessonId);
        if (!lesson) continue;

        // Ders bazlı completion hesapla (son 7 gün)
        let lessonPlanned = 0, lessonCompleted = 0;
        for (const checklist of recentChecklists) {
          for (const item of checklist.items) {
            if (item.lessonId !== lesson.id) continue;
            lessonPlanned += item.plannedBlocks;
            lessonCompleted += item.completedBlocks;
          }
        }

        // Yeterli veri yoksa atla
        if (lessonPlanned < 2) continue;
        const lessonCompletion = lessonCompleted / lessonPlanned;

        // Ders bazlı completion < %55 ise tetikle
        if (lessonCompletion < 0.55) {
          if (!await this.isOnCooldown(userId, 'sure_isteme_ama_tamamlayamama', lf.lessonId)) {
            console.log(`[SF] ✓ sure_isteme_ama_tamamlayamama -> ${lesson.name} (completion=%${Math.round(lessonCompletion * 100)})`);
            messages.push({
              type: 'sure_isteme_ama_tamamlayamama',
              message: `You requested more time for ${lesson.name}, but completion is still at ${Math.round(lessonCompletion * 100)}% — extra blocks have been added but aren't being finished.`,
              suggestion: `More time alone may not be the issue — difficulty or focus could be the real barrier. The extra blocks are there; try starting with just one.`,
            });
            await this.logFeedback(userId, 'sure_isteme_ama_tamamlayamama', lf.lessonId);
          } else { console.log(`[SF] ⏭ sure_isteme_ama_tamamlayamama -> ${lesson.name} (cooldown)`); }
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

      if (lessonPlanned >= 2 && lessonCompleted / lessonPlanned < 0.60) {
        if (!await this.isOnCooldown(userId, 'sinav_az_calisma', lesson.id)) {
          console.log(`[SF] ✓ sinav_az_calisma -> ${lesson.name} (${daysLeft}g kaldi, %${Math.round(lessonCompleted/lessonPlanned*100)} tamamlandi)`);
          messages.push({
            type: 'sinav_az_calisma',
            message: `${lesson.name} exam is ${daysLeft} days away, but most sessions are incomplete — this lesson is at risk.`,
            suggestion: 'Prioritise this lesson in the remaining days.',
          });
          await this.logFeedback(userId, 'sinav_az_calisma', lesson.id);
          await this.writeReviewBlockOverride(userId, lesson.id, weekStart);
          overridesWritten++;
        } else { console.log(`[SF] ⏭ sinav_az_calisma -> ${lesson.name} (cooldown)`); }
        continue;
      }

      if (allocatedBlocks < 4) {
        if (!await this.isOnCooldown(userId, 'sinav_az_blok', lesson.id)) {
          console.log(`[SF] ✓ sinav_az_blok -> ${lesson.name} (${daysLeft}g kaldi, ${allocatedBlocks} blok)`);
          messages.push({
            type: 'sinav_az_blok',
            message: `${lesson.name} exam is ${daysLeft} days away, but only ${allocatedBlocks} block(s) could be allocated this week.`,
            suggestion: allocatedBlocks === 0
              ? 'Update your availability and I\'ll reschedule.'
              : 'Keep other lessons\' blocks short and prioritise this one.',
          });
          await this.logFeedback(userId, 'sinav_az_blok', lesson.id);
          await this.writePriorityOverride(userId, lesson.id, weekStart, 3);
          overridesWritten++;
        } else { console.log(`[SF] ⏭ sinav_az_blok -> ${lesson.name} (cooldown)`); }
      }
    }

    // ── T3: Two consecutive heavy weeks ──────────────────────────────────────
    if (recentFeedbacks.length >= 2) {
      const last2 = recentFeedbacks.slice(0, 2);
      if (last2.every((f) => f.weekloadFeedback === 'cok_yogundu')) {
        if (!await this.isOnCooldown(userId, 'asiri_yuk')) {
          console.log(`[SF] ✓ asiri_yuk`);
          messages.push({
            type: 'asiri_yuk',
            message: 'Your schedule has felt too heavy for two weeks in a row. Next week has been automatically lightened by 15%.',
            suggestion: 'Consider reviewing your busy-time slots.',
          });
          await this.logFeedback(userId, 'asiri_yuk');
        } else { console.log(`[SF] ⏭ asiri_yuk (cooldown)`); }
      }
    }

    // ── Frequent delays ───────────────────────────────────────────────────────
    for (const lesson of lessons) {
      if (lesson.keyfiDelayCount >= 2) {
        if (!await this.isOnCooldown(userId, 'sik_erteleme', lesson.id)) {
          console.log(`[SF] ✓ sik_erteleme -> ${lesson.name} (${lesson.keyfiDelayCount}x)`);
          messages.push({
            type: 'sik_erteleme',
            message: `${lesson.name} has been delayed multiple times — the planner has switched it to slot mode.`,
            suggestion: 'The planner has switched this lesson to slot mode — it now gets a guaranteed spot every few days instead of being scheduled flexibly. Try to complete at least one of those fixed sessions this week.',
          });
          await this.logFeedback(userId, 'sik_erteleme', lesson.id);
        } else { console.log(`[SF] ⏭ sik_erteleme -> ${lesson.name} (cooldown)`); }
      }
    }

    // ── High stress ───────────────────────────────────────────────────────────
    const last3Checklists = recentChecklists.slice(0, 3);
    if (last3Checklists.length >= 3 && last3Checklists.every((c) => c.stressLevel >= 4)) {
      if (!await this.isOnCooldown(userId, 'yuksek_stres')) {
        console.log(`[SF] ✓ yuksek_stres (levels: ${last3Checklists.map(c => c.stressLevel).join(',')})`);
        messages.push({
          type: 'yuksek_stres',
          message: 'Your stress level has been high (≥4) for 3 days in a row.',
          suggestion: 'Consider reviewing your workload or planning a lighter week.',
        });
        await this.logFeedback(userId, 'yuksek_stres');
      } else { console.log(`[SF] ⏭ yuksek_stres (cooldown)`); }
    }

    // ── Inactivity ────────────────────────────────────────────────────────────
    const last2Checklists = recentChecklists.slice(0, 2);
    if (
      last2Checklists.length >= 2 &&
      last2Checklists.every((c) => c.items.reduce((sum, item) => sum + item.completedBlocks, 0) === 0)
    ) {
      if (!await this.isOnCooldown(userId, 'hareketsizlik')) {
        console.log(`[SF] ✓ hareketsizlik`);
        messages.push({
          type: 'hareketsizlik',
          message: 'No study blocks have been completed in the last 2 days.',
          suggestion: 'Try starting with a short session today — even 30 minutes makes a difference.',
        });
        await this.logFeedback(userId, 'hareketsizlik');
      } else { console.log(`[SF] ⏭ hareketsizlik (cooldown)`); }
    }

    // ── Exam intensity forecast ───────────────────────────────────────────────
    const upcomingExams: { lessonName: string; daysLeft: number; difficulty: number }[] = [];
    for (const lesson of lessons) {
      for (const exam of lesson.exams) {
        const daysLeft = Math.ceil((new Date(exam.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 7) {
          upcomingExams.push({ lessonName: lesson.name, daysLeft, difficulty: lesson.difficulty });
        }
      }
    }

    const examDays = new Set(upcomingExams.map(e => e.daysLeft));
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
      const examList = upcomingExams.map(e => `${e.lessonName} (${e.daysLeft}d)`).join(', ');
      if (!await this.isOnCooldown(userId, 'sinav_yogunlugu_kritik')) {
        console.log(`[SF] ✓ sinav_yogunlugu_kritik`);
        messages.push({
          type: 'sinav_yogunlugu_kritik',
          message: `Critical exam week ahead: ${examList}. These are very close — now is the time to focus.`,
          suggestion: 'Your exam lessons are the priority right now. Everything else can wait.',
        });
        await this.logFeedback(userId, 'sinav_yogunlugu_kritik');
      } else { console.log(`[SF] ⏭ sinav_yogunlugu_kritik (cooldown)`); }
    } else if (examIntensityScore >= 6) {
      const examList = upcomingExams.map(e => `${e.lessonName} (${e.daysLeft}d)`).join(', ');
      if (!await this.isOnCooldown(userId, 'sinav_yogunlugu_yogun')) {
        console.log(`[SF] ✓ sinav_yogunlugu_yogun`);
        messages.push({
          type: 'sinav_yogunlugu_yogun',
          message: `A heavy week is coming up: ${examList}. Time to shift focus toward your exam lessons.`,
          suggestion: 'Give extra attention to your exam lessons this week — other topics can stay light.',
        });
        await this.logFeedback(userId, 'sinav_yogunlugu_yogun');
      } else { console.log(`[SF] ⏭ sinav_yogunlugu_yogun (cooldown)`); }
    } else if (examIntensityScore >= 3) {
      if (!await this.isOnCooldown(userId, 'sinav_yogunlugu_orta')) {
        console.log(`[SF] ✓ sinav_yogunlugu_orta`);
        messages.push({
          type: 'sinav_yogunlugu_orta',
          message: `You have ${upcomingExams.length} exam(s) coming up this week. Start preparing now if you haven't already.`,
          suggestion: 'A bit of extra focus on your exam lessons now will make a real difference later.',
        });
        await this.logFeedback(userId, 'sinav_yogunlugu_orta');
      } else { console.log(`[SF] ⏭ sinav_yogunlugu_orta (cooldown)`); }
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
        if (!await this.isOnCooldown(userId, 'program_yogunlugu_asim')) {
          console.log(`[SF] ✓ program_yogunlugu_asim (%${Math.round((capacityRatio - 1) * 100)} fazla)`);
          messages.push({
            type: 'program_yogunlugu_asim',
            message: `Next week's schedule is ${Math.round((capacityRatio - 1) * 100)}% above your recent average capacity — some blocks may go unfinished.`,
            suggestion: 'This is a heads-up, not a change. If the week feels too heavy, your feedback after it will help the system adjust.',
          });
          await this.logFeedback(userId, 'program_yogunlugu_asim');
        } else { console.log(`[SF] ⏭ program_yogunlugu_asim (cooldown)`); }
      } else if (capacityRatio < 0.85) {
        if (!await this.isOnCooldown(userId, 'program_yogunlugu_dusuk')) {
          console.log(`[SF] ✓ program_yogunlugu_dusuk`);
          messages.push({
            type: 'program_yogunlugu_dusuk',
            message: "Next week looks lighter than usual — a good window to catch up on anything you've fallen behind on.",
            suggestion: 'Light weeks are valuable. Use the extra headroom to consolidate rather than coast.',
          });
          await this.logFeedback(userId, 'program_yogunlugu_dusuk');
        } else { console.log(`[SF] ⏭ program_yogunlugu_dusuk (cooldown)`); }
      }
    }

    // ── Combined alerts ───────────────────────────────────────────────────────
    const hasYogunHafta = messages.some(m =>
      m.type === 'sinav_yogunlugu_kritik' || m.type === 'sinav_yogunlugu_yogun' || m.type === 'program_yogunlugu_asim'
    );
    const hasYuksekStres = messages.some(m => m.type === 'yuksek_stres');
    const hasYuksekDelay = messages.filter(m => m.type === 'sik_erteleme').length >= 2;

    if (hasYogunHafta && hasYuksekStres) {
      if (!await this.isOnCooldown(userId, 'kombine_yogun_stres')) {
        console.log(`[SF] ✓ kombine_yogun_stres`);
        messages.push({
          type: 'kombine_yogun_stres',
          message: 'Your schedule is heavy and your stress is high at the same time. This combination can seriously hurt your learning.',
          suggestion: 'Shorten today\'s study blocks — rescheduling is critical.',
        });
        await this.logFeedback(userId, 'kombine_yogun_stres');
      } else { console.log(`[SF] ⏭ kombine_yogun_stres (cooldown)`); }
    }

    if (hasYogunHafta && hasYuksekDelay) {
      if (!await this.isOnCooldown(userId, 'kombine_yogun_erteleme')) {
        console.log(`[SF] ✓ kombine_yogun_erteleme`);
        messages.push({
          type: 'kombine_yogun_erteleme',
          message: 'A heavy week is ahead and your delay rate has historically increased under this kind of load.',
          suggestion: 'The planner is already aware of this pattern — it has prioritised your delayed lessons. Try to honour at least one session for each.',
        });
        await this.logFeedback(userId, 'kombine_yogun_erteleme');
      } else { console.log(`[SF] ⏭ kombine_yogun_erteleme (cooldown)`); }
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
        if (!await this.isOnCooldown(userId, 'dusuk_uyku_stres')) {
          const goodComp = profile?.goodSleepCompletionRate;
          const badComp = profile?.badSleepCompletionRate;
          const goodStress = profile?.goodSleepAvgStress;
          const badStress = profile?.badSleepAvgStress;

          let message = 'Your sleep has been irregular lately and your stress is running high.';
          let suggestion = 'Try to stabilise your sleep first — it\'s the foundation of study performance.';

          // Personalised message when sufficient data exists
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

          console.log(`[SF] ✓ dusuk_uyku_stres (badSleep=${badSleepDays.length}/3 stress=${avgStress.toFixed(1)} goodComp=${goodComp?.toFixed(2) ?? '-'} badComp=${badComp?.toFixed(2) ?? '-'})`);
          messages.push({ type: 'dusuk_uyku_stres', message, suggestion });
          await this.logFeedback(userId, 'dusuk_uyku_stres');
        } else { console.log(`[SF] ⏭ dusuk_uyku_stres (cooldown)`); }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`[SF] SONUC: ${messages.length} mesaj → [${messages.map(m => m.type).join(', ')}]`);

    const aiMessage = await this.buildAiMessage(messages, profile, lastFeedback?.weekloadFeedback ?? null);
    console.log(`[SF] AI: ${aiMessage ? 'uretildi' : 'bos'}`);
    return { messages, aiMessage, overridesWritten };
  }

  // LessonPlanOverride'a review block ekle — planner recalculate'de okur
  private async writeReviewBlockOverride(
    userId: number,
    lessonId: number,
    weekStart: Date,
  ): Promise<void> {
    await this.prisma.lessonPlanOverride.upsert({
      where: {
        userId_lessonId_weekStart: { userId, lessonId, weekStart },
      },
      create: { userId, lessonId, weekStart, addReviewBlock: true },
      update: { addReviewBlock: true },
    });
    console.log(`[SF] override yazildi: lessonId=${lessonId} addReviewBlock=true`);
  }

  // LessonPlanOverride'a priority boost yaz — planner bir sonraki planda okur
  private async writePriorityOverride(
    userId: number,
    lessonId: number,
    weekStart: Date,
    priorityBoost: number,
  ): Promise<void> {
    await this.prisma.lessonPlanOverride.upsert({
      where: {
        userId_lessonId_weekStart: { userId, lessonId, weekStart },
      },
      create: { userId, lessonId, weekStart, priorityBoost },
      update: { priorityBoost },
    });
    console.log(`[SF] override yazildi: lessonId=${lessonId} priorityBoost=+${priorityBoost}`);
  }

  // Per-type cooldown durations in hours
  private readonly cooldownHours: Record<string, number> = {
    sure_isteme_ama_tamamlayamama:   168, // 7 days — tied to weekly feedback cycle
    sinav_az_calisma:                24,  // 1 day  — exam approaching fast, daily reminder ok
    sinav_az_blok:                   168, // 7 days — block allocation is set for the week
    asiri_yuk:                       168, // 7 days — two-week pattern, weekly cadence enough
    sik_erteleme:                    48,  // 2 days — delay count can change, check often
    yuksek_stres:                    24,  // 1 day  — stress is daily data
    hareketsizlik:                   24,  // 1 day  — inactivity compounds fast
    sinav_yogunlugu_kritik:          24,  // 1 day  — critical pressure, student needs daily awareness
    sinav_yogunlugu_yogun:           48,  // 2 days — high but not critical
    sinav_yogunlugu_orta:            168, // 7 days — moderate load, no need to repeat mid-week
    program_yogunlugu_asim:          168, // 7 days — schedule is set for the week
    program_yogunlugu_dusuk:         168, // 7 days — schedule is set for the week
    kombine_yogun_stres:             24,  // 1 day  — high-urgency combo
    kombine_yogun_erteleme:          168, // 7 days — pattern-based, weekly enough
    dusuk_uyku_stres:                24,  // 1 day  — sleep is daily data, situation changes fast
  };

  // Cooldown check — has this type+lesson combination been triggered recently?
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

  // Tetiklenen mesajı log'a yaz
  private async logFeedback(userId: number, type: string, lessonId?: number): Promise<void> {
    await this.prisma.systemFeedbackLog.create({
      data: { userId, type, lessonId: lessonId ?? null },
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

  private async buildAiMessage(
    messages: Array<{ type: string; message: string; suggestion: string }>,
    profile: { completionRate7d: number; avgStress7d: number; consistencyScore: number } | null,
    lastWeekloadFeedback?: string | null,
  ): Promise<string> {
    if (messages.length === 0) return '';

    const prompt = buildSystemFeedbackPrompt({
      triggeredMessages: messages,
      studentProfile: profile,
      lastWeekloadFeedback: (lastWeekloadFeedback as any) ?? null,
      burnoutDetected: false,
      programZorlastu: false,
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
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'baidu/cobuddy:free',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      console.log(`[SF] OpenRouter status=${response.status}`);
      const text = data?.choices?.[0]?.message?.content?.trim() ?? '';
      if (text) console.log(`[SF] AI mesaj: ${text.substring(0, 120)}...`);
      return text;
    } catch (err) {
      console.error('[SF] OpenRouter hatasi:', err);
      return '';
    }
  }

  private daysUntilExam(
    lesson: { exams: Array<{ examDate: Date }> },
    now: Date,
  ): number | null {
    if (lesson.exams.length === 0) return null;
    const future = lesson.exams
      .map((e) => Math.ceil((new Date(e.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      .filter((d) => d >= 0);
    return future.length > 0 ? Math.min(...future) : null;
  }
}