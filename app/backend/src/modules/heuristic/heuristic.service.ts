import { Injectable } from '@nestjs/common';
import { Lesson } from '../lesson/lesson.model';

export interface HeuristicInput {
  lesson: Lesson;
  stress: number;  // S = kullanıcı stres seviyesi (0-10)
  today: Date;
}

export interface HeuristicResult {
  lessonId: string;
  lessonName: string;
  score: number;       // H skoru
  studyHours: number;  // X = haftalık çalışma saati
  urgencyDays: number; // Sınava kaç gün kaldığı
}

// Ağırlıklar
const W1 = 0.4; // urgency
const W2 = 0.3; // remaining (normalized)
const W3 = 0.2; // difficulty * stress
const W4 = 0.1; // delay bonus

@Injectable()
export class HeuristicService {
  /**
   * Bir dersin bir sonraki sınavına kaç gün kaldığını hesaplar.
   * Önce vize tarihine bakar; vize geçmişse finale bakar.
   * Homework deadline'ları ayrıca değerlendirilmez (urgency için exam kullanılır).
   */
  getNextExamDate(lesson: Lesson, today: Date): string | null {
    const midterms = lesson.deadlines
      .filter((d) => d.type === 'midterm')
      .map((d) => d.date)
      .sort();

    const finals = lesson.deadlines
      .filter((d) => d.type === 'final')
      .map((d) => d.date)
      .sort();

    const todayStr = today.toISOString().split('T')[0];

    // Geçmemiş vize varsa onu kullan
    const upcomingMidterm = midterms.find((d) => d >= todayStr);
    if (upcomingMidterm) return upcomingMidterm;

    // Yoksa geçmemiş finali kullan
    const upcomingFinal = finals.find((d) => d >= todayStr);
    return upcomingFinal ?? null;
  }

  /**
   * U = aciliyet: sınava ne kadar az gün kaldıysa o kadar yüksek
   * U = 1 / (daysLeft + 1)
   * Sınav yoksa U = 0
   */
  private calcUrgency(lesson: Lesson, today: Date): { U: number; daysLeft: number } {
    const examDate = this.getNextExamDate(lesson, today);
    if (!examDate) return { U: 0, daysLeft: Infinity };

    const exam = new Date(examDate);
    const diffMs = exam.getTime() - today.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const U = 1 / (daysLeft + 1);
    return { U, daysLeft };
  }

  /**
   * H = w1*U + w2*R + w3*(D*S/50) + w4*B
   *
   * R = remaining normalized: D / sum(D) * 14 çalışma saatine karşı kalan
   *     Basit hesap: delay yoksa R = 0.5 (nötr), delay arttıkça artar
   * D = difficulty (1-5)
   * S = stress (0-10)
   * B = delay > 0 ? 1 : 0
   */
  calcScore(input: HeuristicInput, allLessons: Lesson[]): number {
    const { lesson, stress, today } = input;

    const { U, daysLeft } = this.calcUrgency(lesson, today);
    const D = lesson.difficulty;
    const S = stress;
    const B = lesson.delay > 0 ? 1 : 0;

    // R: delay tabanlı kalan iş yükü göstergesi (0-1 arası normalize)
    const R = Math.min(1, lesson.delay / 5);

    const H = W1 * U + W2 * R + W3 * ((D * S) / 50) + W4 * B;

    void daysLeft; // kullanıldı (urgencyDays için aşağıda tekrar çağırılıyor)
    return Math.round(H * 1000) / 1000;
  }

  /**
   * X = 14 * D / toplam ders D katsayısı toplamı
   * Her ders için haftalık ayrılacak saat
   */
  calcStudyHours(lesson: Lesson, allLessons: Lesson[]): number {
    const totalDifficulty = allLessons.reduce((sum, l) => sum + l.difficulty, 0);
    if (totalDifficulty === 0) return 0;
    return Math.round(((14 * lesson.difficulty) / totalDifficulty) * 10) / 10;
  }

  /**
   * Tüm dersleri skorla, sırala ve çalışma saatlerini hesapla
   */
  rankLessons(lessons: Lesson[], stress: number, today: Date): HeuristicResult[] {
    const results: HeuristicResult[] = lessons.map((lesson) => {
      const { daysLeft } = this.calcUrgency(lesson, today);
      return {
        lessonId: lesson.id,
        lessonName: lesson.lessonName,
        score: this.calcScore({ lesson, stress, today }, lessons),
        studyHours: this.calcStudyHours(lesson, lessons),
        urgencyDays: daysLeft === Infinity ? -1 : daysLeft,
      };
    });

    return results.sort((a, b) => b.score - a.score);
  }
}
