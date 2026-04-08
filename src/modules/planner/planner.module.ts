import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleEntity } from './schedule.entity.js';
import { PlannerService } from './planner.service.js';
import { PlannerController } from './planner.controller.js';
import { HeuristicModule } from '../heuristic/heuristic.module.js';
import { LessonModule } from '../lesson/lesson.module.js';
import { UserModule } from '../user/user.module.js';
import { ChecklistModule } from '../checklist/checklist.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduleEntity]),
    HeuristicModule,
    LessonModule,
    UserModule,
    ChecklistModule,
  ],
  providers: [PlannerService],
  controllers: [PlannerController],
})
export class PlannerModule {}
