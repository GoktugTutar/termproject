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

    // ── Veri çek ───────────────────────────────────────────────────────────
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

    // ── S3: Yoğun ama başarılı ─────────────────────────────────────────────
    if (lastFeedback?.weekloadFeedback === 'cok_yogundu' && profile && profile.completionRate7d >= 0.85) {
      if (!await this.isOnCooldown(userId, 'yogun_ama_basarili')) {
        console.log(`[SF] ✓ yogun_ama_basarili`);
        messages.push({
          type: 'yogun_ama_basarili',
          message: 'Geçen haftayı yoğun hissettin ama planladığın çalışmaların büyük kısmını tamamladın.',
          suggestion: 'Toplam süreyi azaltmak yerine zor dersleri daha dengeli günlere yaydım.',
        });
        await this.logFeedback(userId, 'yogun_ama_basarili');
      } else { console.log(`[SF] ⏭ yogun_ama_basarili (cooldown)`); }
    }

    // ── S4: Süre istiyor ama tamamlayamıyor ───────────────────────────────
    if (profile && profile.completionRate7d < 0.65 && lastFeedback) {
      const needsMoreTimeLessons = lastFeedback.lessonFeedbacks.filter((lf) => lf.needsMoreTime === 1);
      const lessonMap = new Map(lessons.map((l) => [l.id, l]));
      for (const lf of needsMoreTimeLessons) {
        const lesson = lessonMap.get(lf.lessonId);
        if (!lesson) continue;
        if (!await this.isOnCooldown(userId, 'sure_isteme_ama_tamamlayamama', lf.lessonId)) {
          console.log(`[SF] ✓ sure_isteme_ama_tamamlayamama -> ${lesson.name}`);
          messages.push({
            type: 'sure_isteme_ama_tamamlayamama',
            message: `${lesson.name} için daha fazla zamana ihtiyaç duyduğunu belirttin; ancak son oturumların bir kısmı tamamlanmamış.`,
            suggestion: 'Süreyi artırmak yerine bu dersi daha kısa ve sık oturumlara böldüm.',
          });
          await this.logFeedback(userId, 'sure_isteme_ama_tamamlayamama', lf.lessonId);
        } else { console.log(`[SF] ⏭ sure_isteme_ama_tamamlayamama -> ${lesson.name} (cooldown)`); }
      }
    }

    // ── S5 & S6: Sınav yakın ───────────────────────────────────────────────
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
            message: `${lesson.name} sınavına ${daysLeft} gün kaldı ama oturumların büyük kısmı tamamlanmamış — ders riskli.`,
            suggestion: 'Kalan günlerde bu derse öncelik ver.',
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
            message: `${lesson.name} sınavına ${daysLeft} gün kaldı ama bu derse bu hafta yalnızca ${allocatedBlocks} blok ayrılabildi.`,
            suggestion: allocatedBlocks === 0
              ? 'Müsaitlik durumunu güncellersen yeniden planlayabilirim.'
              : 'Diğer derslerin bloklarını kısa tutarak bu derse öncelik ver.',
          });
          await this.logFeedback(userId, 'sinav_az_blok', lesson.id);
          await this.writePriorityOverride(userId, lesson.id, weekStart, 3);
          overridesWritten++;
        } else { console.log(`[SF] ⏭ sinav_az_blok -> ${lesson.name} (cooldown)`); }
      }
    }

    // ── T3: İki hafta üst üste yoğun ──────────────────────────────────────
    if (recentFeedbacks.length >= 2) {
      const last2 = recentFeedbacks.slice(0, 2);
      if (last2.every((f) => f.weekloadFeedback === 'cok_yogundu')) {
        if (!await this.isOnCooldown(userId, 'asiri_yuk')) {
          console.log(`[SF] ✓ asiri_yuk`);
          messages.push({
            type: 'asiri_yuk',
            message: 'İki haftadır program çok yoğun geliyor. Önümüzdeki hafta otomatik %15 hafifletildi.',
            suggestion: "BusyTime'ları gözden geçirmeyi düşün.",
          });
          await this.logFeedback(userId, 'asiri_yuk');
        } else { console.log(`[SF] ⏭ asiri_yuk (cooldown)`); }
      }
    }

    // ── Sık erteleme ──────────────────────────────────────────────────────
    for (const lesson of lessons) {
      if (lesson.keyfiDelayCount >= 2) {
        if (!await this.isOnCooldown(userId, 'sik_erteleme', lesson.id)) {
          console.log(`[SF] ✓ sik_erteleme -> ${lesson.name} (${lesson.keyfiDelayCount}x)`);
          messages.push({
            type: 'sik_erteleme',
            message: `${lesson.name} sık erteleniyor — slotlu mod devreye alındı.`,
            suggestion: 'Bu dersi en az her 3 günde bir planlaman önerilir.',
          });
          await this.logFeedback(userId, 'sik_erteleme', lesson.id);
        } else { console.log(`[SF] ⏭ sik_erteleme -> ${lesson.name} (cooldown)`); }
      }
    }

    // ── Yüksek stres ──────────────────────────────────────────────────────
    const last3Checklists = recentChecklists.slice(0, 3);
    if (last3Checklists.length >= 3 && last3Checklists.every((c) => c.stressLevel >= 4)) {
      if (!await this.isOnCooldown(userId, 'yuksek_stres')) {
        console.log(`[SF] ✓ yuksek_stres (levels: ${last3Checklists.map(c => c.stressLevel).join(',')})`);
        messages.push({
          type: 'yuksek_stres',
          message: 'Son 3 gündür stres seviyeniz yüksek (≥4).',
          suggestion: 'Meşguliyeti gözden geçirmeyi veya daha hafif bir hafta planlamayı düşün.',
        });
        await this.logFeedback(userId, 'yuksek_stres');
      } else { console.log(`[SF] ⏭ yuksek_stres (cooldown)`); }
    }

    // ── Hareketsizlik ─────────────────────────────────────────────────────
    const last2Checklists = recentChecklists.slice(0, 2);
    if (
      last2Checklists.length >= 2 &&
      last2Checklists.every((c) => c.items.reduce((sum, item) => sum + item.completedBlocks, 0) === 0)
    ) {
      if (!await this.isOnCooldown(userId, 'hareketsizlik')) {
        console.log(`[SF] ✓ hareketsizlik`);
        messages.push({
          type: 'hareketsizlik',
          message: 'Son 2 gündür hiç çalışma bloğu tamamlanmadı.',
          suggestion: 'Bugün kısa bir oturumla başlamayı dene — 30 dakika bile fark yaratır.',
        });
        await this.logFeedback(userId, 'hareketsizlik');
      } else { console.log(`[SF] ⏭ hareketsizlik (cooldown)`); }
    }

    // ── Sınav yoğunluğu öngörüsü ─────────────────────────────────────────
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
      const examList = upcomingExams.map(e => `${e.lessonName} (${e.daysLeft}g)`).join(', ');
      if (!await this.isOnCooldown(userId, 'sinav_yogunlugu_kritik')) {
        console.log(`[SF] ✓ sinav_yogunlugu_kritik`);
        messages.push({
          type: 'sinav_yogunlugu_kritik',
          message: `Önümüzdeki haftada yoğun bir sınav dönemi var: ${examList}. Acil hazırlık modu gerekiyor.`,
          suggestion: 'Bu haftaki planı sınav moduna geç, diğer dersleri minimize et.',
        });
        await this.logFeedback(userId, 'sinav_yogunlugu_kritik');
      } else { console.log(`[SF] ⏭ sinav_yogunlugu_kritik (cooldown)`); }
    } else if (examIntensityScore >= 6) {
      const examList = upcomingExams.map(e => `${e.lessonName} (${e.daysLeft}g)`).join(', ');
      if (!await this.isOnCooldown(userId, 'sinav_yogunlugu_yogun')) {
        console.log(`[SF] ✓ sinav_yogunlugu_yogun`);
        messages.push({
          type: 'sinav_yogunlugu_yogun',
          message: `Önümüzdeki hafta yoğun: ${examList}. İyi bir hazırlık için bu haftadan başla.`,
          suggestion: 'Sınav derslerine öncelik ver, yeni konu girişini ertele.',
        });
        await this.logFeedback(userId, 'sinav_yogunlugu_yogun');
      } else { console.log(`[SF] ⏭ sinav_yogunlugu_yogun (cooldown)`); }
    } else if (examIntensityScore >= 3) {
      if (!await this.isOnCooldown(userId, 'sinav_yogunlugu_orta')) {
        console.log(`[SF] ✓ sinav_yogunlugu_orta`);
        messages.push({
          type: 'sinav_yogunlugu_orta',
          message: `Önümüzdeki hafta ${upcomingExams.length} sınav var. Orta yoğunlukta bir hafta seni bekliyor.`,
          suggestion: 'Sınav derslerine biraz daha ağırlık ver.',
        });
        await this.logFeedback(userId, 'sinav_yogunlugu_orta');
      } else { console.log(`[SF] ⏭ sinav_yogunlugu_orta (cooldown)`); }
    }

    // ── Program yoğunluğu öngörüsü ────────────────────────────────────────
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
            message: `Önümüzdeki hafta ders programı geçmiş haftaların ortalamasının %${Math.round((capacityRatio - 1) * 100)} üzerinde.`,
            suggestion: 'Görevleri günler arasında dengeli dağıtmak ister misin?',
          });
          await this.logFeedback(userId, 'program_yogunlugu_asim');
        } else { console.log(`[SF] ⏭ program_yogunlugu_asim (cooldown)`); }
      } else if (capacityRatio < 0.85) {
        if (!await this.isOnCooldown(userId, 'program_yogunlugu_dusuk')) {
          console.log(`[SF] ✓ program_yogunlugu_dusuk`);
          messages.push({
            type: 'program_yogunlugu_dusuk',
            message: 'Haftaya ders programın oldukça hafif. Ertelenmiş görevleri tamamlamak için iyi bir fırsat.',
            suggestion: 'Birikimli dersleri bu haftaya taşıyabilirsin.',
          });
          await this.logFeedback(userId, 'program_yogunlugu_dusuk');
        } else { console.log(`[SF] ⏭ program_yogunlugu_dusuk (cooldown)`); }
      }
    }

    // ── Kombine uyarılar ──────────────────────────────────────────────────
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
          message: 'Hem programın yoğun hem de stres seviyenin yüksek. Bu kombinasyon öğrenmeni ciddi etkiler.',
          suggestion: 'Bugünkü çalışma bloğunu kısalt, yeniden planlama kritik.',
        });
        await this.logFeedback(userId, 'kombine_yogun_stres');
      } else { console.log(`[SF] ⏭ kombine_yogun_stres (cooldown)`); }
    }

    if (hasYogunHafta && hasYuksekDelay) {
      if (!await this.isOnCooldown(userId, 'kombine_yogun_erteleme')) {
        console.log(`[SF] ✓ kombine_yogun_erteleme`);
        messages.push({
          type: 'kombine_yogun_erteleme',
          message: 'Önümüzdeki hafta yoğun ve geçmişte bu yoğunlukta erteleme oranı artmış.',
          suggestion: 'Erteleme eğilimli dersleri haftanın başına al.',
        });
        await this.logFeedback(userId, 'kombine_yogun_erteleme');
      } else { console.log(`[SF] ⏭ kombine_yogun_erteleme (cooldown)`); }
    }

    // ── Uyku & stres tetikleyicisi ────────────────────────────────────────
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
          console.log(`[SF] ✓ dusuk_uyku_stres (badSleep=${badSleepDays.length}/3 stress=${avgStress.toFixed(1)})`);
          messages.push({
            type: 'dusuk_uyku_stres',
            message: 'Son günlerde uyku düzenin bozulmuş görünüyor ve stres seviyen de yüksek.',
            suggestion: 'Çalışma verimini korumak için önce uyku düzenini stabilize etmeye çalış.',
          });
          await this.logFeedback(userId, 'dusuk_uyku_stres');
        } else { console.log(`[SF] ⏭ dusuk_uyku_stres (cooldown)`); }
      }
    }
    // ──────────────────────────────────────────────────────────────────────

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

  // Cooldown kontrolü — aynı tip+ders kombinasyonu 48 saat içinde tetiklendi mi?
  private async isOnCooldown(userId: number, type: string, lessonId?: number): Promise<boolean> {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
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