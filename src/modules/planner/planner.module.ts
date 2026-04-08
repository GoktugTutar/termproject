import { forwardRef, Module } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { PlannerController } from './planner.controller';
import { HeuristicModule } from '../heuristic/heuristic.module';
import { LessonModule } from '../lesson/lesson.module';
import { UserModule } from '../user/user.module';
import { ChecklistModule } from '../checklist/checklist.module';

@Module({
  imports: [
    HeuristicModule,
    LessonModule,
    UserModule,
    forwardRef(() => ChecklistModule),
  ],
  providers: [PlannerService],
  controllers: [PlannerController],
  exports: [PlannerService],
})
export class PlannerModule {}
