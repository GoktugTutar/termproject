import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Lesson } from './lesson.model';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

const DATA_PATH = path.join(__dirname, '../../data/lessons.json');

@Injectable()
export class LessonService {
  private read(): Lesson[] {
    try {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    } catch {
      return [];
    }
  }

  private write(lessons: Lesson[]): void {
    fs.writeFileSync(DATA_PATH, JSON.stringify(lessons, null, 2));
  }

  findAllByUser(userId: string): Lesson[] {
    return this.read().filter((l) => l.userId === userId);
  }

  findById(id: string): Lesson | undefined {
    return this.read().find((l) => l.id === id);
  }

  findByName(userId: string, lessonName: string): Lesson | undefined {
    return this.read().find(
      (l) => l.userId === userId && l.lessonName === lessonName,
    );
  }

  /**
   * Toplu ders kaydı - JSON dizisi olarak gelir
   */
  bulkCreate(userId: string, dtos: CreateLessonDto[]): Lesson[] {
    const lessons = this.read();
    const created: Lesson[] = dtos.map((dto) => ({
      id: uuidv4(),
      userId,
      lessonName: dto.lessonName,
      difficulty: dto.difficulty,
      deadlines: dto.deadlines,
      semester: dto.semester,
      delay: 0,
      createdAt: new Date().toISOString(),
    }));
    lessons.push(...created);
    this.write(lessons);
    return created;
  }

  /**
   * Ders adıyla güncelleme
   */
  update(userId: string, dto: UpdateLessonDto): Lesson {
    const lessons = this.read();
    const idx = lessons.findIndex(
      (l) => l.userId === userId && l.lessonName === dto.lessonName,
    );
    if (idx === -1) throw new NotFoundException('Ders bulunamadı');

    const { lessonName: _name, newLessonName, ...rest } = dto;
    lessons[idx] = {
      ...lessons[idx],
      ...rest,
      ...(newLessonName ? { lessonName: newLessonName } : {}),
    };
    this.write(lessons);
    return lessons[idx];
  }

  /**
   * Checklist submit sonrası delay güncelleme
   * Erken bitmesi veya aşılması her ikisi de delay'i artırır
   */
  applyChecklistResult(
    id: string,
    userId: string,
    plannedHours: number,
    actualHours: number | null,
  ): Lesson {
    const lessons = this.read();
    const idx = lessons.findIndex((l) => l.id === id && l.userId === userId);
    if (idx === -1) throw new NotFoundException('Ders bulunamadı');

    if (actualHours !== null) {
      const R = plannedHours - actualHours;
      // Herhangi bir sapma (erken veya geç) delay'i artırır
      if (R !== 0) {
        lessons[idx].delay += 1;
      }
    } else {
      // Tamamlanmadı (not_done) - delay artar
      lessons[idx].delay += 1;
    }

    this.write(lessons);
    return lessons[idx];
  }

  remove(id: string, userId: string): void {
    const lessons = this.read();
    const filtered = lessons.filter(
      (l) => !(l.id === id && l.userId === userId),
    );
    if (filtered.length === lessons.length)
      throw new NotFoundException('Ders bulunamadı');
    this.write(filtered);
  }
}
