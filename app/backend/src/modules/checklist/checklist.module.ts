import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChecklistEntity } from './checklist.entity';
import { ChecklistService } from './checklist.service';
import { ChecklistController } from './checklist.controller';
import { LessonModule } from '../lesson/lesson.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChecklistEntity]), LessonModule],
  providers: [ChecklistService],
  controllers: [ChecklistController],
})
export class ChecklistModule {}
