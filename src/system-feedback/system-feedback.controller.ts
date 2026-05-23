import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { SystemFeedbackService } from './system-feedback.service';
import { PlannerService } from '../planner/planner.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('system-feedback')
export class SystemFeedbackController {
  constructor(
    private systemFeedbackService: SystemFeedbackService,
    private plannerService: PlannerService,
  ) {}

  // Sistemin kullanıcıya ürettiği AI destekli haftalık mesajı getir
  // Override yazıldıysa planı anında yeniden oluştur
  @Get('message')
  async getMessages(@Request() req) {
    const result = await this.systemFeedbackService.getMessages(req.user.id);

    // Override yazıldıysa recalculate tetikle (fire-and-forget)
    if (result.overridesWritten > 0) {
      console.log(`[SF-CTRL] ${result.overridesWritten} override yazildi, recalculate tetikleniyor`);
      this.plannerService.recalculate(req.user.id).catch(() => {});
    }

    return result;
  }
}