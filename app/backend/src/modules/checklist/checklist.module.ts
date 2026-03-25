import { Module } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { ChecklistController } from './checklist.controller';
import { LessonModule } from '../lesson/lesson.module';

@Module({
  imports: [LessonModule],
  providers: [ChecklistService],
  controllers: [ChecklistController],
})
export class ChecklistModule {}
