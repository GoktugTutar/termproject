import { Injectable } from '@nestjs/common';
import { daysBetween } from '../../common/utils/date.utils';

// H = w1*U + w2*R + w3*D*S + w4*B
const W1 = -0.5; // U: days until deadline (fewer days → higher H)
const W2 = 1.0;  // R: remaining hours needed
const W3 = 0.3;  // D*S: difficulty × stress
const W4 = 2.0;  // B: delay count penalty

export interface HeuristicResult {
  lessonId: string;
  lessonName: string;
  H: number;   // priority score (higher = more urgent)
  U: number;   // days until next exam
  R: number;   // remaining hours needed this week
  X: number;   // total weekly hours allocated
  D: number;   // difficulty
  S: number;   // stress level
  B: number;   // delay count
}

@Injectable()
export class HeuristicService {
  calculateX(lesson: any, allLessons: any[]): number {
    const totalD = allLessons.reduce((sum, l) => sum + l.difficulty, 0);
    if (totalD === 0) return 0;
    return (14 * lesson.difficulty) / totalD;
  }

  calculateU(lesson: any, now: Date = new Date()): number {
    const nextExam = (lesson.exams ?? [])
      .map((e: any) => new Date(e.examDate))
      .filter((d: Date) => d > now)
      .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];
    return nextExam ? daysBetween(now, nextExam) : 0;
  }

  calculateR(lesson: any, allLessons: any[], weekChecklists: any[], isFirstDay: boolean): number {
    const X = this.calculateX(lesson, allLessons);
    if (isFirstDay || weekChecklists.length === 0) return X;

    const completed = weekChecklists.reduce((sum, checklist) => {
      const entry = (checklist.checklistItems ?? checklist.items ?? []).find(
        (item: any) => item.lessonId === lesson.id,
      );
      if (!entry || entry.completedHours === null) return sum;
      if (entry.postponementReason === 'completed_early') return sum + X;
      return sum + Math.max(0, entry.completedHours);
    }, 0);

    return Math.max(0, X - completed);
  }

  calculateH(U: number, R: number, D: number, S: number, B: number): number {
    return W1 * U + W2 * R + W3 * D * S + W4 * B;
  }

  calculate(
    lesson: any,
    allLessons: any[],
    stressLevel: number,
    weekChecklists: any[],
    isFirstDay: boolean,
  ): HeuristicResult {
    const X = this.calculateX(lesson, allLessons);
    const U = this.calculateU(lesson);
    const R = this.calculateR(lesson, allLessons, weekChecklists, isFirstDay);
    const D = lesson.difficulty;
    const S = stressLevel;
    const B = lesson.delayCount;
    const H = this.calculateH(U, R, D, S, B);
    return { lessonId: lesson.id, lessonName: lesson.name, H, U, R, X, D, S, B };
  }

  rankLessons(
    lessons: any[],
    stressLevel: number,
    weekChecklists: any[],
    isFirstDay: boolean,
  ): HeuristicResult[] {
    return lessons
      .map((lesson) => this.calculate(lesson, lessons, stressLevel, weekChecklists, isFirstDay))
      .sort((a, b) => b.H - a.H);
  }
}
