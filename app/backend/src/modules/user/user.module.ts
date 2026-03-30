import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { LessonEntity } from '../lesson/lesson.entity.js';
import { ChecklistEntity } from '../checklist/checklist.entity.js';
import { ScheduleEntity } from '../planner/schedule.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, LessonEntity, ChecklistEntity, ScheduleEntity])],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
