import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChecklistEntity } from './checklist.entity.js';
import { ChecklistService } from './checklist.service.js';
import { ChecklistController } from './checklist.controller.js';
import { LessonModule } from '../lesson/lesson.module.js';
import { ScheduleEntity } from '../planner/schedule.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChecklistEntity, ScheduleEntity]),
    LessonModule,
  ],
  providers: [ChecklistService],
  controllers: [ChecklistController],
  exports: [ChecklistService],
})
export class ChecklistModule {}
