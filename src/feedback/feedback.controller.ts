import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { WeeklyFeedbackDto } from './dto/weekly-feedback.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  // Haftalık geri bildirim kaydet
  @Post('weekly')
  saveWeekly(@Request() req, @Body() dto: WeeklyFeedbackDto) {
    return this.feedbackService.saveWeeklyFeedback(req.user.id, dto);
  }

  // Aktif uyarı ve öneri mesajlarını getir
  @Get('messages')
  getMessages(@Request() req) {
    return this.feedbackService.getMessages(req.user.id);
  }
}
