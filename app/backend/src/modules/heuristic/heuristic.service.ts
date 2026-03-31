import { Injectable } from '@nestjs/common';
import { LessonEntity } from '../lesson/lesson.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { ChecklistEntity } from '../checklist/checklist.entity.js';
import { daysBetween } from '../../common/utils/date.utils.js';

// All inputs are normalized to [0, 1] before weighting.
// H = 0.35*U + 0.30*R + 0.20*(D*S) + 0.15*B
const W1 = 0.35; // urgency       → most important, avoids missed deadlines
const W2 = 0.30; // remaining     → prioritize lessons with more work left
const W3  = 0.20; // difficulty × stress → combined cognitive load
const W4 = 0.15; // delay penalty → least weight, don't overwhelm the student

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
   * U = 1 / (daysLeft + 1)         range: (0, 1]
   * daysLeft = 0 (due tomorrow) → U = 1.0  (maximum urgency)
   * daysLeft = 9                → U ≈ 0.1  (low urgency)
   *
   * Uses vize date if it hasn't passed; otherwise uses final date.
   */
  calculateU(lesson: LessonEntity, now: Date = new Date()): number {
    const vize = lesson.vizeDate ? new Date(lesson.vizeDate) : null;
    const final = lesson.finalDate ? new Date(lesson.finalDate) : null;

    let daysLeft: number;
    if (vize && vize > now) {
      daysLeft = daysBetween(now, vize);
    } else if (final && final > now) {
      daysLeft = daysBetween(now, final);
    } else {
      daysLeft = 0; // both deadlines passed → treat as maximum urgency
    }
 
    return 1 / (daysLeft + 1);
  }

  /**
   * R = (X - completedHours) / X   range: [0, 1]
   * Represents what fraction of the planned weekly hours still remain.
   * On the first call (no checklist yet) R = 1.0 (nothing completed).
   */
  calculateR(
    lesson: LessonEntity,
    allLessons: LessonEntity[],
    weekChecklists: ChecklistEntity[],
    isFirstDay: boolean,
  ): number {
    const X = this.calculateX(lesson, allLessons);
    if (isFirstDay || weekChecklists.length === 0) return 1;

    const completed = weekChecklists.reduce((sum, checklist) => {
      const entry = checklist.lessons.find((l) => l.lessonId === lesson.id);
      if (!entry || entry.hoursCompleted === null) return sum;
      // Infinity encoded as 9999 in DB; treat as full X
      if (entry.hoursCompleted >= 9999) return sum + X;
      return sum + Math.max(0, entry.hoursCompleted);
    }, 0);

    return Math.max(0, (X - completed) / X);
  }

  /**
   * D = difficulty / 5             range: [0.2, 1.0]  (difficulty is 1–5)
   */
  normalizeD(difficulty: number): number {
    return difficulty / 5;
  }
 
  /**
   * S = stress / 10                range: [0.1, 1.0]  (stress is 1–10)
   */
  normalizeS(stress: number): number {
    return stress / 10;
  }
 
  /**
   * B = min(delayCount / 5, 1)     range: [0, 1]
   * Delay is distinguishable up to 5; beyond that it's capped at 1
   * so we don't overwhelm the student by over-penalizing.
   */
  normalizeB(delayCount: number): number {
    return Math.min(delayCount / 5, 1);
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
    const D = this.normalizeD(lesson.difficulty);
    const S = this.normalizeS(user.stressLevel ?? 1);
    const B = this.normalizeB(lesson.delayCount);
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
