import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { LessonService } from '../lesson/lesson.service';
import { HeuristicService, HeuristicResult } from '../heuristic/heuristic.service';

export interface ScheduleSlot {
  day: string;       // örn. "2025-03-25"
  dayLabel: string;  // örn. "Pazartesi"
  lessonId: string;
  lessonName: string;
  hours: number;
  score: number;
}

export interface WeeklySchedule {
  generatedAt: string;
  weekStart: string;
  slots: ScheduleSlot[];
  ranked: HeuristicResult[];
}

const DAY_LABELS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

@Injectable()
export class PlannerService {
  constructor(
    private readonly userService: UserService,
    private readonly lessonService: LessonService,
    private readonly heuristicService: HeuristicService,
  ) {}

  generateSchedule(userId: string): WeeklySchedule {
    const user = this.userService.findById(userId);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    const lessons = this.lessonService.findAllByUser(userId);
    if (lessons.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        weekStart: this.getWeekStart(),
        slots: [],
        ranked: [],
      };
    }

    const today = new Date();
    const ranked = this.heuristicService.rankLessons(lessons, user.stress, today);

    // Bu haftanın günlerini üret (bugünden itibaren 7 gün)
    const days = this.buildWeekDays(today);

    // Her derse haftalık çalışma saatini dağıt
    const slots: ScheduleSlot[] = [];
    const availableHoursPerDay = 6; // günlük max çalışma saati

    // Her günün ne kadar dolu olduğunu tut
    const dayLoad: Record<string, number> = {};
    days.forEach((d) => (dayLoad[d.date] = 0));

    for (const result of ranked) {
      let remainingStudyHours = result.studyHours;

      for (const day of days) {
        if (remainingStudyHours <= 0) break;
        const available = availableHoursPerDay - dayLoad[day.date];
        if (available <= 0) continue;

        const hoursToday = Math.min(remainingStudyHours, available, 3); // günde max 3 saat aynı ders
        if (hoursToday <= 0) continue;

        slots.push({
          day: day.date,
          dayLabel: day.label,
          lessonId: result.lessonId,
          lessonName: result.lessonName,
          hours: hoursToday,
          score: result.score,
        });

        dayLoad[day.date] += hoursToday;
        remainingStudyHours -= hoursToday;
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      weekStart: days[0].date,
      slots,
      ranked,
    };
  }

  private buildWeekDays(from: Date): { date: string; label: string }[] {
    const days: { date: string; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      days.push({
        date: d.toISOString().split('T')[0],
        label: DAY_LABELS[d.getDay()],
      });
    }
    return days;
  }

  private getWeekStart(): string {
    return new Date().toISOString().split('T')[0];
  }
}
