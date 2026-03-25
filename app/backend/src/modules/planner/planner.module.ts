import { Module } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { PlannerController } from './planner.controller';
import { UserModule } from '../user/user.module';
import { LessonModule } from '../lesson/lesson.module';
import { HeuristicModule } from '../heuristic/heuristic.module';

@Module({
  imports: [UserModule, LessonModule, HeuristicModule],
  providers: [PlannerService],
  controllers: [PlannerController],
})
export class PlannerModule {}
