import { Injectable } from '@nestjs/common';
import { LessonEntity } from '../lesson/lesson.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { ChecklistEntity } from '../checklist/checklist.entity.js';
import { daysBetween } from '../../common/utils/date.utils.js';

// Default weights for H = w1*U + w2*R + w3*D*S + w4*B
const W1 = -0.5; // U: days until deadline (negative → fewer days = higher H)
const W2 = 1.0;  // R: remaining hours needed
const W3 = 0.3;  // D*S: difficulty × stress
const W4 = 2.0;  // B: delay count penalty

export interface HeuristicResult {
  lessonId: string;
  lessonName: string;
  H: number;  // priority score (higher = more urgent)
  U: number;  // days until next exam
  R: number;  // remaining hours needed this week
  X: number;  // total weekly hours allocated
  D: number;  // difficulty
  S: number;  // stress level
  B: number;  // delay count
}

@Injectable()
export class HeuristicService {
  /**
   * X = 14 * D_i / sum(D_all)
   * Distributes 14 weekly study hours proportionally by difficulty.
   */
  calculateX(lesson: LessonEntity, allLessons: LessonEntity[]): number {
    const totalD = allLessons.reduce((sum, l) => sum + l.difficulty, 0);
    if (totalD === 0) return 0;
    return (14 * lesson.difficulty) / totalD;
  }

  /**
   * U = days until next relevant exam.
   * Uses vize date if it hasn't passed; otherwise uses final date.
   */
  calculateU(lesson: LessonEntity, now: Date = new Date()): number {
    const vize = lesson.vizeDate ? new Date(lesson.vizeDate) : null;
    const final = lesson.finalDate ? new Date(lesson.finalDate) : null;

    if (vize && vize > now) return daysBetween(now, vize);
    if (final && final > now) return daysBetween(now, final);
    return 0; // both deadlines passed
  }

  /**
   * R = X - totalHoursCompletedThisWeek (from checklist history).
   * On the first day (Monday / no checklist) R = X.
   */
  calculateR(
    lesson: LessonEntity,
    allLessons: LessonEntity[],
    weekChecklists: ChecklistEntity[],
    isFirstDay: boolean,
  ): number {
    const X = this.calculateX(lesson, allLessons);
    if (isFirstDay || weekChecklists.length === 0) return X;

    const completed = weekChecklists.reduce((sum, checklist) => {
      const entry = checklist.lessons.find((l) => l.lessonId === lesson.id);
      if (!entry || entry.hoursCompleted === null) return sum;
      // Infinity encoded as 9999 in DB; treat as full X
      if (entry.hoursCompleted >= 9999) return sum + X;
      return sum + Math.max(0, entry.hoursCompleted);
    }, 0);

    return Math.max(0, X - completed);
  }

  /**
   * H = w1*U + w2*R + w3*D*S + w4*B
   */
  calculateH(U: number, R: number, D: number, S: number, B: number): number {
    return W1 * U + W2 * R + W3 * D * S + W4 * B;
  }

  /**
   * Full heuristic calculation for a single lesson.
   */
  calculate(
    lesson: LessonEntity,
    allLessons: LessonEntity[],
    user: UserEntity,
    weekChecklists: ChecklistEntity[],
    isFirstDay: boolean,
  ): HeuristicResult {
    const X = this.calculateX(lesson, allLessons);
    const U = this.calculateU(lesson);
    const R = this.calculateR(lesson, allLessons, weekChecklists, isFirstDay);
    const D = lesson.difficulty;
    const S = user.stressLevel ?? 1;
    const B = lesson.delayCount;
    const H = this.calculateH(U, R, D, S, B);

    return { lessonId: lesson.id, lessonName: lesson.name, H, U, R, X, D, S, B };
  }

  /**
   * Rank all lessons for a user by H score (highest first = most urgent).
   */
  rankLessons(
    lessons: LessonEntity[],
    user: UserEntity,
    weekChecklists: ChecklistEntity[],
    isFirstDay: boolean,
  ): HeuristicResult[] {
    return lessons
      .map((lesson) => this.calculate(lesson, lessons, user, weekChecklists, isFirstDay))
      .sort((a, b) => b.H - a.H);
  }
}
