import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { LessonService } from '../lesson/lesson.service';
import { HeuristicService, HeuristicResult } from '../heuristic/heuristic.service';

export interface DailySlot {
  day: string;       // YYYY-MM-DD
  dayLabel: string;  // Ör: "Pazartesi"
  lessonId: string;
  lessonName: string;
  hours: number;
  score: number;
}

export interface DailyPlan {
  date: string;
  freeHours: number;
  slots: DailySlot[];
}

export interface WeeklySchedule {
  generatedAt: string;
  weekStart: string;
  slots: DailySlot[];
  ranked: HeuristicResult[];
}

const DAY_LABELS = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
];

@Injectable()
export class PlannerService {
  constructor(
    private readonly userService: UserService,
    private readonly lessonService: LessonService,
    private readonly heuristicService: HeuristicService,
  ) {}

  async createWeeklyPlan(userId: string): Promise<WeeklySchedule> {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    const lessons = await this.lessonService.findAllByUser(userId);
    if (lessons.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        weekStart: this.todayStr(),
        slots: [],
        ranked: [],
      };
    }

    const today = new Date();
    const ranked = this.heuristicService.rankLessons(lessons, user.stress, today);
    const days = this.buildWeekDays(today);

    const slots: DailySlot[] = [];
    const MAX_HOURS_PER_DAY = 6;
    const MAX_HOURS_PER_LESSON_PER_DAY = 3;

    const dayLoad: Record<string, number> = {};
    days.forEach((d) => (dayLoad[d.date] = 0));

    for (const result of ranked) {
      let remaining = result.studyHours;

      for (const day of days) {
        if (remaining <= 0) break;
        const available = Math.min(
          MAX_HOURS_PER_DAY - dayLoad[day.date],
          MAX_HOURS_PER_LESSON_PER_DAY,
        );
        if (available <= 0) continue;

        const hoursToday = Math.min(remaining, available);
        slots.push({
          day: day.date,
          dayLabel: day.label,
          lessonId: result.lessonId,
          lessonName: result.lessonName,
          hours: hoursToday,
          score: result.score,
        });

        dayLoad[day.date] += hoursToday;
        remaining -= hoursToday;
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      weekStart: days[0].date,
      slots,
      ranked,
    };
  }

  async createDailyPlan(userId: string, freeHours: number): Promise<DailyPlan> {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    const lessons = await this.lessonService.findAllByUser(userId);
    const today = new Date();
    const todayStr = this.todayStr();
    const dayLabel = DAY_LABELS[today.getDay()];

    if (lessons.length === 0) {
      return { date: todayStr, freeHours, slots: [] };
    }

    const ranked = this.heuristicService.rankLessons(lessons, user.stress, today);

    const slots: DailySlot[] = [];
    const MAX_PER_LESSON = Math.min(3, freeHours);
    let remainingFree = freeHours;

    for (const result of ranked) {
      if (remainingFree <= 0) break;
      const hours = Math.min(remainingFree, MAX_PER_LESSON, result.studyHours / 7);
      const roundedHours = Math.round(hours * 10) / 10;
      if (roundedHours <= 0) continue;

      slots.push({
        day: todayStr,
        dayLabel,
        lessonId: result.lessonId,
        lessonName: result.lessonName,
        hours: roundedHours,
        score: result.score,
      });

      remainingFree -= roundedHours;
    }

    return { date: todayStr, freeHours, slots };
  }

  private buildWeekDays(from: Date): { date: string; label: string }[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      return {
        date: d.toISOString().split('T')[0],
        label: DAY_LABELS[d.getDay()],
      };
    });
  }

  private todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }
}
