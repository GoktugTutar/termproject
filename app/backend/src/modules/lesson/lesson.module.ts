import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonEntity } from './lesson.entity.js';
import { LessonService } from './lesson.service.js';
import { LessonController } from './lesson.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([LessonEntity])],
  providers: [LessonService],
  controllers: [LessonController],
  exports: [LessonService],
})
export class LessonModule {}
