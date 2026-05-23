import { Module } from '@nestjs/common';
import { SystemFeedbackController } from './system-feedback.controller';
import { SystemFeedbackService } from './system-feedback.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PlannerModule } from '../planner/planner.module';

@Module({
  imports: [PrismaModule, PlannerModule],
  controllers: [SystemFeedbackController],
  providers: [SystemFeedbackService],
  exports: [SystemFeedbackService],
})
export class SystemFeedbackModule {}