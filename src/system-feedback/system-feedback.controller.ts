import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { SystemFeedbackService } from './system-feedback.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('system-feedback')
export class SystemFeedbackController {
  constructor(private systemFeedbackService: SystemFeedbackService) {}

  // Sistemin kullanıcıya ürettiği AI destekli haftalık mesajı getir
  @Get('message')
  getMessages(@Request() req) {
    return this.systemFeedbackService.getMessages(req.user.id);
  }
}
