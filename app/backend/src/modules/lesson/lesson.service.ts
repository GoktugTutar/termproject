import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Lesson } from './lesson.model';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { TrackLessonDto } from './dto/track-lesson.dto';

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

  create(userId: string, dto: CreateLessonDto): Lesson {
    const lessons = this.read();
    const lesson: Lesson = {
      id: uuidv4(),
      userId,
      lessonName: dto.lessonName,
      difficulty: dto.difficulty as 1 | 2 | 3,
      examDate: dto.examDate,
      examType: dto.examType as 'quiz' | 'midterm' | 'final',
      allocatedHours: dto.allocatedHours,
      remaining: dto.allocatedHours,
      delay: 0,
      createdAt: new Date().toISOString(),
    };
    lessons.push(lesson);
    this.write(lessons);
    return lesson;
  }

  update(id: string, userId: string, dto: UpdateLessonDto): Lesson {
    const lessons = this.read();
    const idx = lessons.findIndex((l) => l.id === id && l.userId === userId);
    if (idx === -1) throw new NotFoundException('Ders bulunamadı');
    lessons[idx] = { ...lessons[idx], ...dto } as Lesson;
    this.write(lessons);
    return lessons[idx];
  }

  trackProgress(id: string, userId: string, dto: TrackLessonDto): Lesson {
    const lessons = this.read();
    const idx = lessons.findIndex((l) => l.id === id && l.userId === userId);
    if (idx === -1) throw new NotFoundException('Ders bulunamadı');

    const lesson = lessons[idx];
    const diff = dto.actualHours - dto.plannedHours;

    if (dto.completed) {
      // Gerçek süre planlanan süreden fazlaysa delay artar
      if (diff > 0) {
        lesson.delay += diff;
      }
      // Kalan saati güncelle
      lesson.remaining = Math.max(0, lesson.remaining - dto.actualHours);
    }

    this.write(lessons);
    return lesson;
  }

  remove(id: string, userId: string): void {
    const lessons = this.read();
    const filtered = lessons.filter((l) => !(l.id === id && l.userId === userId));
    if (filtered.length === lessons.length) throw new NotFoundException('Ders bulunamadı');
    this.write(filtered);
  }
}
