import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ChecklistItem } from './checklist.model';
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

  getToday(userId: string): ChecklistItem[] {
    const today = new Date().toISOString().split('T')[0];
    return this.read().filter((c) => c.userId === userId && c.date === today);
  }

  getAll(userId: string): ChecklistItem[] {
    return this.read().filter((c) => c.userId === userId);
  }

  /**
   * Planner'dan gelen schedule'a göre bugünkü checklist oluşturur
   * (slots içindeki today'e ait dilimler)
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
      plannedHours: slot.hours,
      actualHours: 0,
      completed: false,
      date: today,
      createdAt: new Date().toISOString(),
    }));
    checklists.push(...newItems);
    this.write(checklists);
    return newItems;
  }

  /**
   * Gün sonu: kullanıcı checklist sonucunu gönderir
   * Lesson'ın remaining ve delay değerleri güncellenir
   */
  submit(userId: string, dto: SubmitChecklistDto): ChecklistItem {
    const items = this.read();
    const today = new Date().toISOString().split('T')[0];

    // Var olan checklist kaydını bul
    let item = items.find(
      (c) =>
        c.userId === userId &&
        c.lessonId === dto.lessonId &&
        c.date === today,
    );

    if (!item) {
      // Yoksa yeni oluştur (manuel submit)
      const lesson = this.lessonService.findById(dto.lessonId);
      if (!lesson) throw new NotFoundException('Ders bulunamadı');
      item = {
        id: uuidv4(),
        userId,
        lessonId: dto.lessonId,
        lessonName: lesson.lessonName,
        plannedHours: dto.plannedHours,
        actualHours: dto.actualHours,
        completed: dto.completed,
        date: today,
        createdAt: new Date().toISOString(),
      };
      items.push(item);
    } else {
      item.actualHours = dto.actualHours;
      item.completed = dto.completed;
    }

    this.write(items);

    // Lesson'ı güncelle
    this.lessonService.trackProgress(dto.lessonId, userId, {
      plannedHours: dto.plannedHours,
      actualHours: dto.actualHours,
      completed: dto.completed,
    });

    return item;
  }
}
