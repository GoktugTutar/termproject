import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { LessonModule } from './modules/lesson/lesson.module.js';
import { HeuristicModule } from './modules/heuristic/heuristic.module.js';
import { PlannerModule } from './modules/planner/planner.module.js';
import { ChecklistModule } from './modules/checklist/checklist.module.js';
import { UserEntity } from './modules/user/user.entity.js';
import { LessonEntity } from './modules/lesson/lesson.entity.js';
import { ChecklistEntity } from './modules/checklist/checklist.entity.js';
import { ScheduleEntity } from './modules/planner/schedule.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'termproject'),
        entities: [UserEntity, LessonEntity, ChecklistEntity, ScheduleEntity],
        synchronize: true,
      }),
    }),
    AuthModule,
    UserModule,
    LessonModule,
    HeuristicModule,
    PlannerModule,
    ChecklistModule,
  ],
})
export class AppModule {}
