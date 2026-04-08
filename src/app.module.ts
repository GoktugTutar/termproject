import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { ChecklistModule } from './modules/checklist/checklist.module';
import { HeuristicModule } from './modules/heuristic/heuristic.module';
import { PlannerModule } from './modules/planner/planner.module';
import { DecisionTreeModule } from './modules/decision-tree/decision-tree.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    LessonModule,
    ChecklistModule,
    HeuristicModule,
    PlannerModule,
    DecisionTreeModule,
  ],
})
export class AppModule {}
