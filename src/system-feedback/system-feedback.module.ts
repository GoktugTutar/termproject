import { Module } from '@nestjs/common';
import { SystemFeedbackController } from './system-feedback.controller';
import { SystemFeedbackService } from './system-feedback.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemFeedbackController],
  providers: [SystemFeedbackService],
  exports: [SystemFeedbackService],
})
export class SystemFeedbackModule {}
