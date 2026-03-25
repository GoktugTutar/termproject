import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { HeuristicModule } from './modules/heuristic/heuristic.module';
import { PlannerModule } from './modules/planner/planner.module';
import { ChecklistModule } from './modules/checklist/checklist.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    LessonModule,
    HeuristicModule,
    PlannerModule,
    ChecklistModule,
  ],
})
export class AppModule {}
