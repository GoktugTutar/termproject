import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChecklistEntity } from './checklist.entity';
import { ChecklistItem, ChecklistStatus } from './checklist.model';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { LessonService } from '../lesson/lesson.service';

@Injectable()
export class ChecklistService {
  constructor(
    @InjectRepository(ChecklistEntity)
    private readonly checklistRepo: Repository<ChecklistEntity>,
    private readonly lessonService: LessonService,
  ) {}

  async getAll(userId: string): Promise<ChecklistItem[]> {
    return this.checklistRepo.find({ where: { userId } }) as unknown as Promise<ChecklistItem[]>;
  }

  async getToday(userId: string): Promise<ChecklistItem[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.checklistRepo.find({ where: { userId, date: today } }) as unknown as Promise<ChecklistItem[]>;
  }

  async createFromSlots(
    userId: string,
    slots: { lessonId: string; lessonName: string; hours: number }[],
  ): Promise<ChecklistItem[]> {
    const today = new Date().toISOString().split('T')[0];
    const entities = slots.map((slot) =>
      this.checklistRepo.create({
        userId,
        lessonId: slot.lessonId,
        lessonName: slot.lessonName,
        date: today,
        plannedHours: slot.hours,
        actualHours: null,
        status: 'pending',
        remaining: null,
      }),
    );
    const saved = await this.checklistRepo.save(entities);
    return saved as unknown as ChecklistItem[];
  }

  async submit(
    userId: string,
    dto: SubmitChecklistDto,
  ): Promise<ChecklistItem & { remainingDisplay: string }> {
    const today = new Date().toISOString().split('T')[0];

    let item = await this.checklistRepo.findOne({
      where: { userId, lessonId: dto.lessonId, date: today },
    });

    if (!item) {
      const lesson = await this.lessonService.findById(dto.lessonId);
      if (!lesson) throw new NotFoundException('Ders bulunamadı');

      item = this.checklistRepo.create({
        userId,
        lessonId: dto.lessonId,
        lessonName: lesson.lessonName,
        date: today,
        plannedHours: 0,
        actualHours: null,
        status: 'pending',
        remaining: null,
      });
    }

    let remaining: number | null = null;
    const status = dto.status;

    if (status === 'not_done') {
      item.actualHours = 0;
      remaining = null;
    } else if (status === 'completed') {
      item.actualHours = item.plannedHours;
      remaining = 0;
    } else {
      item.actualHours = dto.actualHours ?? 0;
      remaining = item.plannedHours - item.actualHours;
    }

    item.status = status;
    item.remaining = remaining;
    await this.checklistRepo.save(item);

    await this.lessonService.applyChecklistResult(
      dto.lessonId,
      userId,
      item.plannedHours,
      status === 'not_done' ? null : item.actualHours,
    );

    return {
      ...(item as unknown as ChecklistItem),
      remainingDisplay: this.formatRemaining(status as ChecklistStatus, remaining),
    };
  }

  private formatRemaining(status: ChecklistStatus, remaining: number | null): string {
    if (status === 'not_done') return 'inf';
    if (status === 'completed') return '0';
    if (remaining === null) return 'inf';
    if (remaining < 0) return `-${Math.abs(remaining)}`;
    return `${remaining}`;
  }
}
