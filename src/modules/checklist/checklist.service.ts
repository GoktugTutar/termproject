import {
  BadRequestException, forwardRef, Inject, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LessonService } from '../lesson/lesson.service';
import { PlannerService } from '../planner/planner.service';
import { SubmitChecklistDto, LessonSubmissionDto } from './dto/submit-checklist.dto';
import {
  todayString, getDayName, dateStringToDate, prismaDateToString,
  timeToHour, getCurrentHour,
} from '../../common/utils/date.utils';

@Injectable()
export class ChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lessonService: LessonService,
    @Inject(forwardRef(() => PlannerService))
    private readonly plannerService: PlannerService,
  ) {}

  async createForToday(userId: string) {
    if (getDayName() === 'sunday') {
      throw new BadRequestException(
        'Pazar günü checklist oluşturulmaz. Programınız haftalık olarak oluşturulur.',
      );
    }

    const today = todayString();
    const checklistDate = dateStringToDate(today);

    let checklist = await this.loadChecklistByDate(userId, checklistDate);
    if (checklist && (checklist.checklistItems ?? []).length > 0) {
      return this.serializeChecklist(checklist);
    }

    // Find the active schedule covering today
    const schedule = await this.prisma.weeklySchedule.findFirst({
      where: {
        userId,
        weekStartDate: { lte: checklistDate },
        weekEndDate: { gte: checklistDate },
      },
      orderBy: { weekStartDate: 'desc' },
    });

    if (!schedule) {
      throw new NotFoundException('No schedule found. Run /planner/create first.');
    }

    const blocks = await this.prisma.scheduleBlock.findMany({
      where: { weeklyScheduleId: schedule.id, blockDate: checklistDate },
      orderBy: { startTime: 'asc' },
    });

    const lessonBlocks = blocks.filter((b) => b.lessonId);
    if (lessonBlocks.length === 0) {
      throw new BadRequestException('Bugün için planlanmış çalışma bulunmuyor.');
    }

    if (!checklist) {
      checklist = await this.prisma.dailyChecklist.upsert({
        where: { userId_checklistDate: { userId, checklistDate } },
        update: {},
        create: { userId, checklistDate, submitted: false },
        include: { checklistItems: true },
      });
    }

    // Aggregate hours per lesson
    const aggregated = new Map<string, { allocatedHours: number; scheduleBlockId: string }>();
    for (const block of lessonBlocks) {
      const existing = aggregated.get(block.lessonId!);
      if (existing) {
        existing.allocatedHours += block.plannedHours;
      } else {
        aggregated.set(block.lessonId!, {
          allocatedHours: block.plannedHours,
          scheduleBlockId: block.id,
        });
      }
    }

    await this.prisma.checklistItem.deleteMany({ where: { dailyChecklistId: checklist.id } });
    await this.prisma.checklistItem.createMany({
      data: [...aggregated.entries()].map(([lessonId, entry]) => ({
        dailyChecklistId: checklist!.id,
        lessonId,
        scheduleBlockId: entry.scheduleBlockId,
        allocatedHours: entry.allocatedHours,
        completedHours: 0,
        wasCompleted: false,
        taskFeltLong: false,
      })),
    });

    const loaded = await this.loadChecklistByDate(userId, checklistDate);
    if (!loaded) throw new NotFoundException('No checklist for today');
    return this.serializeChecklist(loaded);
  }

  async getTodayChecklist(userId: string) {
    const checklist = await this.loadChecklistByDate(userId, dateStringToDate(todayString()));
    if (!checklist) throw new NotFoundException('No checklist for today');
    return this.serializeChecklist(checklist);
  }

  async submit(userId: string, dto: SubmitChecklistDto) {
    // 22:00 restriction
    if (getCurrentHour() < 22) {
      throw new BadRequestException('Checklist yalnızca saat 22:00\'dan sonra gönderilebilir.');
    }

    const today = todayString();
    const checklistDate = dateStringToDate(today);
    const checklist = await this.loadChecklistByDate(userId, checklistDate);
    if (!checklist) throw new NotFoundException('No checklist for today');

    // Update checklist metadata
    await this.prisma.dailyChecklist.update({
      where: { id: checklist.id },
      data: {
        ...(dto.overallFocusScore !== undefined && { overallFocusScore: dto.overallFocusScore }),
        ...(dto.overallEnergyScore !== undefined && { overallEnergyScore: dto.overallEnergyScore }),
        ...(dto.todaySleeped !== undefined && { todaySleeped: dto.todaySleeped }),
        ...(dto.stressLevel !== undefined && { stressLevel: dto.stressLevel }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    const submissionMap = new Map(dto.lessons.map((l) => [l.lessonId, l]));

    for (const item of checklist.checklistItems ?? []) {
      const submission = submissionMap.get(item.lessonId);
      if (!submission) continue;

      const wasDelay = this.isDelayState(item.completedHours, item.wasCompleted, item.postponementReason);
      const updates = this.applySubmission(item, submission);
      const isDelay = this.isDelaySubmission(submission.hoursCompleted);

      await this.prisma.checklistItem.update({ where: { id: item.id }, data: updates });

      if (isDelay && !wasDelay) {
        await this.lessonService.incrementDelay(item.lessonId);
      }
    }

    const allItems = await this.prisma.checklistItem.findMany({
      where: { dailyChecklistId: checklist.id },
    });
    const submitted = allItems.length > 0 && allItems.every((i) => i.completedHours !== null);

    await this.prisma.dailyChecklist.update({
      where: { id: checklist.id },
      data: { submitted },
    });

    if (submitted) {
      // Auto-trigger planner after successful checklist submission
      await this.plannerService.createOrUpdate(userId).catch(() => {
        // Silently ignore planner errors — checklist is already saved
      });
    }

    const updated = await this.loadChecklistByDate(userId, checklistDate);
    return this.serializeChecklist(updated!);
  }

  async getWeekChecklists(userId: string) {
    const { startDate, endDate } = this.currentWeekRange();
    return this.prisma.dailyChecklist.findMany({
      where: {
        userId,
        checklistDate: { gte: startDate, lte: endDate },
      },
      include: { checklistItems: true },
      orderBy: { checklistDate: 'asc' },
    });
  }

  async isTodaySubmitted(userId: string): Promise<boolean> {
    const checklist = await this.loadChecklistByDate(userId, dateStringToDate(todayString()));
    return checklist?.submitted ?? false;
  }

  /** Returns lessonIds that were marked completed_early this week */
  async getEarlyCompletedIds(userId: string): Promise<string[]> {
    const checklists = await this.getWeekChecklists(userId);
    const ids = new Set<string>();
    for (const checklist of checklists) {
      for (const item of checklist.checklistItems ?? []) {
        if (item.postponementReason === 'completed_early') {
          ids.add(item.lessonId);
        }
      }
    }
    return [...ids];
  }

  async getLatestStressLevel(userId: string): Promise<number> {
    const latest = await this.prisma.dailyChecklist.findFirst({
      where: { userId },
      orderBy: { checklistDate: 'desc' },
    });
    return latest?.stressLevel ?? 3;
  }

  private async loadChecklistByDate(userId: string, checklistDate: Date) {
    return this.prisma.dailyChecklist.findUnique({
      where: { userId_checklistDate: { userId, checklistDate } },
      include: { checklistItems: true },
    });
  }

  serializeChecklist(checklist: any) {
    return {
      id: checklist.id,
      date: prismaDateToString(checklist.checklistDate),
      submitted: checklist.submitted,
      stressLevel: checklist.stressLevel,
      overallFocusScore: checklist.overallFocusScore,
      overallEnergyScore: checklist.overallEnergyScore,
      todaySleeped: checklist.todaySleeped,
      notes: checklist.notes,
      lessons: (checklist.checklistItems ?? []).map((item: any) => ({
        id: item.id,
        lessonId: item.lessonId,
        scheduleBlockId: item.scheduleBlockId,
        allocatedHours: item.allocatedHours,
        remainingHours: this.remainingHours(item),
        hoursCompleted: this.encodeHoursCompleted(item),
      })),
    };
  }

  private remainingHours(item: any): number {
    if (item.completedHours === null) return item.allocatedHours;
    if (item.postponementReason === 'completed_early') return 0;
    return Math.max(0, item.allocatedHours - Math.abs(item.completedHours));
  }

  private encodeHoursCompleted(item: any): number | null {
    if (item.completedHours === null) return null;
    if (item.postponementReason === 'completed_early') return 9999;
    if (!item.wasCompleted && item.completedHours === 0) return -9999;
    if (!item.wasCompleted) return -Math.abs(item.completedHours);
    return item.completedHours;
  }

  private applySubmission(item: any, submission: LessonSubmissionDto) {
    const base = {
      difficultyFeedback: submission.difficultyFeedback ?? null,
      focusFeedback: submission.focusFeedback ?? null,
      taskFeltLong: submission.taskFeltLong ?? false,
    };

    if (submission.hoursCompleted === 9999) {
      return { ...base, completedHours: item.allocatedHours, wasCompleted: true, postponementReason: 'completed_early' };
    }
    if (submission.hoursCompleted === -9999) {
      return { ...base, completedHours: 0, wasCompleted: false, postponementReason: submission.postponementReason?.trim() || 'not_done' };
    }
    if (submission.hoursCompleted < 0) {
      const hours = Math.max(0, Math.round(Math.abs(submission.hoursCompleted)));
      return { ...base, completedHours: hours, wasCompleted: false, postponementReason: submission.postponementReason?.trim() || 'incomplete' };
    }
    const hours = Math.max(0, Math.round(submission.hoursCompleted));
    return { ...base, completedHours: hours, wasCompleted: true, postponementReason: null };
  }

  private isDelaySubmission(hoursCompleted: number): boolean {
    return hoursCompleted < 0;
  }

  private isDelayState(completedHours: number | null, wasCompleted: boolean, postponementReason: string | null): boolean {
    return completedHours !== null && !wasCompleted && postponementReason !== 'completed_early';
  }

  private currentWeekRange(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { startDate: monday, endDate: sunday };
  }
}
