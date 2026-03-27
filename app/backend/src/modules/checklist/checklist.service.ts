import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ChecklistItem, ChecklistStatus } from './checklist.model';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { LessonService } from '../lesson/lesson.service';

const DATA_PATH = path.join(__dirname, '../../data/checklists.json');

@Injectable()
export class ChecklistService {
  constructor(private readonly lessonService: LessonService) {}

  private read(): ChecklistItem[] {
    try {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    } catch {
      return [];
    }
  }

  private write(items: ChecklistItem[]): void {
    fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2));
  }

  /**
   * GET /checklist/get
   * Tüm checklist öğelerini döner; her birinde kalan süre (R) ve durum bulunur
   */
  getAll(userId: string): ChecklistItem[] {
    return this.read().filter((c) => c.userId === userId);
  }

  getToday(userId: string): ChecklistItem[] {
    const today = new Date().toISOString().split('T')[0];
    return this.read().filter((c) => c.userId === userId && c.date === today);
  }

  /**
   * POST /checklist/create
   * Planner'ın günlük slotlarından bugün için checklist öğeleri oluşturur
   */
  createFromSlots(
    userId: string,
    slots: { lessonId: string; lessonName: string; hours: number }[],
  ): ChecklistItem[] {
    const checklists = this.read();
    const today = new Date().toISOString().split('T')[0];

    const newItems: ChecklistItem[] = slots.map((slot) => ({
      id: uuidv4(),
      userId,
      lessonId: slot.lessonId,
      lessonName: slot.lessonName,
      date: today,
      plannedHours: slot.hours,
      actualHours: null,
      status: 'pending' as ChecklistStatus,
      remaining: null,
      createdAt: new Date().toISOString(),
    }));

    checklists.push(...newItems);
    this.write(checklists);
    return newItems;
  }

  /**
   * PATCH /checklist/submit
   * Gün sonu: kullanıcı sonucu girer.
   * R = plannedHours - actualHours hesaplanır.
   * Durum ve R değeri kaydedilir; lesson delay güncellenir.
   */
  submit(userId: string, dto: SubmitChecklistDto): ChecklistItem & { remainingDisplay: string } {
    const items = this.read();
    const today = new Date().toISOString().split('T')[0];

    let item = items.find(
      (c) => c.userId === userId && c.lessonId === dto.lessonId && c.date === today,
    );

    if (!item) {
      const lesson = this.lessonService.findById(dto.lessonId);
      if (!lesson) throw new NotFoundException('Ders bulunamadı');

      item = {
        id: uuidv4(),
        userId,
        lessonId: dto.lessonId,
        lessonName: lesson.lessonName,
        date: today,
        plannedHours: 0,
        actualHours: null,
        status: 'pending',
        remaining: null,
        createdAt: new Date().toISOString(),
      };
      items.push(item);
    }

    // Durumu ve R'yi hesapla
    let remaining: number | null = null;
    const status = dto.status;

    if (status === 'not_done') {
      item.actualHours = 0;
      remaining = null; // inf
    } else if (status === 'completed') {
      item.actualHours = item.plannedHours;
      remaining = 0;
    } else {
      item.actualHours = dto.actualHours ?? 0;
      remaining = item.plannedHours - item.actualHours; // negatif = erken
    }

    item.status = status;
    item.remaining = remaining;

    this.write(items);

    // Lesson delay'ini güncelle
    this.lessonService.applyChecklistResult(
      dto.lessonId,
      userId,
      item.plannedHours,
      status === 'not_done' ? null : item.actualHours,
    );

    return {
      ...item,
      remainingDisplay: this.formatRemaining(status, remaining),
    };
  }

  /**
   * Kalan süreyi spec notasyonuyla formatlar:
   * -#  → erken bitti (# saat erken)
   * 0   → tamamlandı
   * inf → tamamlanmadı
   * #   → eksik (# saat eksik)
   */
  private formatRemaining(status: ChecklistStatus, remaining: number | null): string {
    if (status === 'not_done') return 'inf';
    if (status === 'completed') return '0';
    if (remaining === null) return 'inf';
    if (remaining < 0) return `-${Math.abs(remaining)}`;
    return `${remaining}`;
  }
}
