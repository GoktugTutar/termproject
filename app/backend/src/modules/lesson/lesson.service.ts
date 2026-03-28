import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonEntity } from './lesson.entity';
import { Lesson } from './lesson.model';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(LessonEntity)
    private readonly lessonRepo: Repository<LessonEntity>,
  ) {}

  async findAllByUser(userId: string): Promise<Lesson[]> {
    return this.lessonRepo.find({ where: { userId } });
  }

  async findById(id: string): Promise<Lesson | null> {
    return this.lessonRepo.findOne({ where: { id } });
  }

  async findByName(userId: string, lessonName: string): Promise<Lesson | null> {
    return this.lessonRepo.findOne({ where: { userId, lessonName } });
  }

  async bulkCreate(userId: string, dtos: CreateLessonDto[]): Promise<Lesson[]> {
    const entities = dtos.map((dto) =>
      this.lessonRepo.create({
        userId,
        lessonName: dto.lessonName,
        difficulty: dto.difficulty,
        deadlines: dto.deadlines,
        semester: dto.semester,
        delay: 0,
      }),
    );
    return this.lessonRepo.save(entities);
  }

  async update(userId: string, dto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({
      where: { userId, lessonName: dto.lessonName },
    });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');

    if (dto.newLessonName) lesson.lessonName = dto.newLessonName;
    if (dto.difficulty !== undefined) lesson.difficulty = dto.difficulty;
    if (dto.deadlines !== undefined) lesson.deadlines = dto.deadlines;
    if (dto.semester !== undefined) lesson.semester = dto.semester;

    return this.lessonRepo.save(lesson);
  }

  async applyChecklistResult(
    id: string,
    userId: string,
    plannedHours: number,
    actualHours: number | null,
  ): Promise<void> {
    const lesson = await this.lessonRepo.findOne({ where: { id, userId } });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');

    if (actualHours !== null) {
      const R = plannedHours - actualHours;
      if (R !== 0) lesson.delay += 1;
    } else {
      lesson.delay += 1;
    }

    await this.lessonRepo.save(lesson);
  }

  async remove(id: string, userId: string): Promise<void> {
    const lesson = await this.lessonRepo.findOne({ where: { id, userId } });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    await this.lessonRepo.remove(lesson);
  }
}
