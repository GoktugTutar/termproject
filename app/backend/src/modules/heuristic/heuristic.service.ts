import { Injectable } from '@nestjs/common';
import { Lesson } from '../lesson/lesson.model';

export interface HeuristicInput {
  lesson: Lesson;
  stress: number;    // kullanıcının stress seviyesi (0-10)
  today: Date;
}

export interface HeuristicResult {
  lessonId: string;
  lessonName: string;
  score: number;     // H skoru
  studyHours: number; // X çalışma saati
}

// Ağırlıklar
const W1 = 0.4; // urgency
const W2 = 0.3; // remaining
const W3 = 0.2; // difficulty * stress
const W4 = 0.1; // delay bonus

@Injectable()
export class HeuristicService {
  /**
   * Sınava kaç gün kaldığını hesaplar
   */
  private daysUntilExam(examDate: string, today: Date): number {
    const exam = new Date(examDate);
    const diffMs = exam.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Urgency (U): Sınava ne kadar az gün kaldıysa urgency o kadar yüksek
   * U = 1 / (daysLeft + 1)
   */
  private calcUrgency(daysLeft: number): number {
    return 1 / (daysLeft + 1);
  }

  /**
   * Remaining (R): Kalan çalışma saatinin toplam saate oranı
   * R = remaining / allocatedHours
   */
  private calcRemaining(lesson: Lesson): number {
    if (lesson.allocatedHours === 0) return 0;
    return lesson.remaining / lesson.allocatedHours;
  }

  /**
   * Delay bonus (B): Gecikmesi olan derse ekstra öncelik
   * B = delay > 0 ? 1 : 0
   */
  private calcDelayBonus(delay: number): number {
    return delay > 0 ? 1 : 0;
  }

  /**
   * H = w1*U + w2*R + w3*(D*S/30) + w4*B
   * D = difficulty (1-3), S = stress (0-10)
   */
  calcScore(input: HeuristicInput): number {
    const { lesson, stress, today } = input;
    const daysLeft = this.daysUntilExam(lesson.examDate, today);

    const U = this.calcUrgency(daysLeft);
    const R = this.calcRemaining(lesson);
    const D = lesson.difficulty;
    const S = stress;
    const B = this.calcDelayBonus(lesson.delay);

    const H = W1 * U + W2 * R + W3 * ((D * S) / 30) + W4 * B;
    return Math.round(H * 1000) / 1000;
  }

  /**
   * X = 14 * D / toplam ders zorluk katsayısı toplamı
   * Her ders için haftalık ayrılacak saat
   */
  calcStudyHours(lesson: Lesson, allLessons: Lesson[]): number {
    const totalDifficulty = allLessons.reduce((sum, l) => sum + l.difficulty, 0);
    if (totalDifficulty === 0) return 0;
    const X = (14 * lesson.difficulty) / totalDifficulty;
    return Math.round(X * 10) / 10;
  }

  /**
   * Tüm dersleri skorla, sırala ve çalışma saatlerini hesapla
   */
  rankLessons(
    lessons: Lesson[],
    stress: number,
    today: Date,
  ): HeuristicResult[] {
    const results: HeuristicResult[] = lessons.map((lesson) => ({
      lessonId: lesson.id,
      lessonName: lesson.lessonName,
      score: this.calcScore({ lesson, stress, today }),
      studyHours: this.calcStudyHours(lesson, lessons),
    }));

    return results.sort((a, b) => b.score - a.score);
  }
}
