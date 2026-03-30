import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ChecklistEntity } from './checklist.entity.js';
import { SubmitChecklistDto } from './dto/submit-checklist.dto.js';
import { LessonService } from '../lesson/lesson.service.js';
import { ScheduleEntity } from '../planner/schedule.entity.js';
import { todayString, getDayName } from '../../common/utils/date.utils.js';

@Injectable()
export class ChecklistService {
  constructor(
    @InjectRepository(ChecklistEntity)
    private readonly repo: Repository<ChecklistEntity>,
    @InjectRepository(ScheduleEntity)
    private readonly scheduleRepo: Repository<ScheduleEntity>,
    private readonly lessonService: LessonService,
  ) {}

  /**
   * /checklist/create
   * Reads today's slots from the current schedule and builds the daily checklist.
   */
  async createForToday(userId: string): Promise<ChecklistEntity> {
    // Pazar günü checklist oluşturulmaz — yeni haftanın programı oluşturulur
    if (getDayName() === 'sunday') {
      throw new BadRequestException(
        'Pazar günü checklist oluşturulmaz. Yeni haftanın programını oluşturmak için /planner/create kullanın.',
      );
    }

    const today = todayString();

    const existing = await this.repo.findOne({ where: { userId, date: today } });
    if (existing) return existing;

    const schedule = await this.scheduleRepo.findOne({
      where: { userId },
      order: { startDate: 'DESC' },
    });

    if (!schedule) {
      throw new NotFoundException('No schedule found. Run /planner/create first.');
    }

    const dayName = getDayName();
    const todaySlots: Record<string, string> = schedule.schedule[dayName] ?? {};

    // Aggregate hours per lesson
    const hoursMap = new Map<string, number>();
    for (const [range, value] of Object.entries(todaySlots)) {
      if (value.startsWith('busy:')) continue;
      const [s, e] = range.split('-').map(Number);
      hoursMap.set(value, (hoursMap.get(value) ?? 0) + (e - s));
    }

    const lessons = [...hoursMap.entries()].map(([lessonId, allocatedHours]) => ({
      lessonId,
      allocatedHours,
      hoursCompleted: null,
    }));

    const checklist = this.repo.create({ userId, date: today, lessons, submitted: false });
    return this.repo.save(checklist);
  }

  /**
   * /checklist/get
   * Returns today's checklist with remaining time (R) per lesson.
   */
  async getTodayChecklist(userId: string) {
    const today = todayString();
    const checklist = await this.repo.findOne({ where: { userId, date: today } });
    if (!checklist) throw new NotFoundException('No checklist for today');

    return {
      id: checklist.id,
      date: checklist.date,
      submitted: checklist.submitted,
      lessons: checklist.lessons.map((l) => ({
        lessonId: l.lessonId,
        allocatedHours: l.allocatedHours,
        // R = remaining = allocatedHours - hoursCompleted (null = not yet submitted)
        remainingHours:
          l.hoursCompleted === null
            ? l.allocatedHours
            : Math.max(0, l.allocatedHours - Math.abs(l.hoursCompleted)),
        hoursCompleted: l.hoursCompleted,
      })),
    };
  }

  /**
   * /checklist/submit
   * Persists completion data, increments delay for unfinished lessons,
   * and marks early-completed lessons (9999) so planner can drop their future slots.
   */
  async submit(userId: string, dto: SubmitChecklistDto): Promise<ChecklistEntity> {
    const today = todayString();
    const checklist = await this.repo.findOne({ where: { userId, date: today } });
    if (!checklist) throw new NotFoundException('No checklist for today');
    if (checklist.submitted) throw new BadRequestException('Already submitted');

    // Map incoming data
    const submissionMap = new Map(dto.lessons.map((l) => [l.lessonId, l.hoursCompleted]));

    for (const entry of checklist.lessons) {
      const hours = submissionMap.get(entry.lessonId);
      if (hours === undefined) continue;
      entry.hoursCompleted = hours;

      const isDelay = hours < 0 || hours === -9999;
      if (isDelay) {
        await this.lessonService.incrementDelay(entry.lessonId);
      }
    }

    checklist.submitted = true;
    return this.repo.save(checklist);
  }

  /**
   * Returns all checklists for the current ISO week (Mon–Sun).
   */
  async getWeekChecklists(userId: string): Promise<ChecklistEntity[]> {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon...
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return this.repo.find({
      where: {
        userId,
        date: Between(
          monday.toISOString().split('T')[0],
          sunday.toISOString().split('T')[0],
        ),
      },
    });
  }

  /** Bugünün checklistinin submit edilip edilmediğini döndürür. */
  async isTodaySubmitted(userId: string): Promise<boolean> {
    const today = todayString();
    const checklist = await this.repo.findOne({ where: { userId, date: today } });
    return checklist?.submitted ?? false;
  }

  /**
   * Returns the set of lesson IDs that were finished early this week.
   */
  async getEarlyCompletedIds(userId: string): Promise<string[]> {
    const checklists = await this.getWeekChecklists(userId);
    const ids = new Set<string>();
    for (const cl of checklists) {
      for (const l of cl.lessons) {
        if (l.hoursCompleted === 9999) ids.add(l.lessonId);
      }
    }
    return [...ids];
  }
}
