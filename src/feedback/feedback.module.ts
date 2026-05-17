import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { SystemFeedbackModule } from '../system-feedback/system-feedback.module';

@Module({
  imports: [SystemFeedbackModule],
  providers: [FeedbackService],
  controllers: [FeedbackController],
})
export class FeedbackModule {}