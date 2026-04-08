import { forwardRef, Module } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { ChecklistController } from './checklist.controller';
import { LessonModule } from '../lesson/lesson.module';
import { PlannerModule } from '../planner/planner.module';

@Module({
  imports: [LessonModule, forwardRef(() => PlannerModule)],
  providers: [ChecklistService],
  controllers: [ChecklistController],
  exports: [ChecklistService],
})
export class ChecklistModule {}
