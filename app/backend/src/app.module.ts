import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { HeuristicModule } from './modules/heuristic/heuristic.module';
import { PlannerModule } from './modules/planner/planner.module';
import { ChecklistModule } from './modules/checklist/checklist.module';
import { UserEntity } from './modules/user/user.entity';
import { LessonEntity } from './modules/lesson/lesson.entity';
import { ChecklistEntity } from './modules/checklist/checklist.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME', 'termproject'),
        entities: [UserEntity, LessonEntity, ChecklistEntity],
        synchronize: true,
      }),
      inject: [ConfigService],
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
