import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { LessonModule } from './lesson/lesson.module';
import { PlannerModule } from './planner/planner.module';
import { ChecklistModule } from './checklist/checklist.module';
import { FeedbackModule } from './feedback/feedback.module';
import { DebugController } from './debug/debug.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    LessonModule,
    PlannerModule,
    ChecklistModule,
    FeedbackModule,
  ],
  controllers: [DebugController],
})
export class AppModule {}
