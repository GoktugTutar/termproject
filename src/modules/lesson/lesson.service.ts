import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonEntity } from './lesson.entity.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(LessonEntity)
    private readonly repo: Repository<LessonEntity>,
  ) {}

  async registerMany(
    userId: string,
    dtos: CreateLessonDto[],
  ): Promise<LessonEntity[]> {
    const entities = dtos.map((dto) => {
      const entity = this.repo.create();
      entity.userId = userId;
      entity.name = dto.name;
      entity.credit = dto.credit;
      entity.difficulty = dto.difficulty;
      entity.vizeDate = dto.vizeDate ? new Date(dto.vizeDate) : null;
      entity.finalDate = dto.finalDate ? new Date(dto.finalDate) : null;
      entity.homeworkDeadlines = dto.homeworkDeadlines ?? [];
      entity.semester = dto.semester;
      entity.delayCount = 0;
      return entity;
    });
    return this.repo.save(entities);
  }

  async update(
    userId: string,
    lessonName: string,
    dto: UpdateLessonDto,
  ): Promise<LessonEntity> {
    const lesson = await this.repo.findOne({
      where: { userId, name: lessonName },
    });
    if (!lesson)
      throw new NotFoundException(`Lesson "${lessonName}" not found`);

    if (dto.vizeDate) lesson.vizeDate = new Date(dto.vizeDate);
    if (dto.finalDate) lesson.finalDate = new Date(dto.finalDate);

    const { vizeDate, finalDate, ...rest } = dto;
    Object.assign(lesson, rest);

    return this.repo.save(lesson);
  }

  async findByUserId(userId: string): Promise<LessonEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  async findById(id: string): Promise<LessonEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async incrementDelay(lessonId: string): Promise<void> {
    await this.repo.increment({ id: lessonId }, 'delayCount', 1);
  }

  async delete(userId: string, lessonId: string): Promise<void> {
    const lesson = await this.repo.findOne({ where: { id: lessonId, userId } });
    if (!lesson) throw new NotFoundException(`Lesson "${lessonId}" not found`);
    await this.repo.remove(lesson);
  }
}
