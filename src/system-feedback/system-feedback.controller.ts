import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { IsString, IsOptional, IsInt } from 'class-validator';
import { SystemFeedbackService } from './system-feedback.service';
import { PlannerService } from '../planner/planner.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

class SaveInsightAnswerDto {
  @IsString()
  questionType!: string;

  @IsString()
  answer!: string;

  @IsOptional()
  @IsInt()
  lessonId?: number;
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('system-feedback')
export class SystemFeedbackController {
  constructor(
    private systemFeedbackService: SystemFeedbackService,
    private plannerService: PlannerService,
  ) {}

  // Sistemin kullanıcıya ürettiği AI destekli haftalık mesajı getir
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

  // Kullanıcının insight sorusuna verdiği cevabı kaydet
  @Post('insight-answer')
  saveInsightAnswer(@Request() req, @Body() dto: SaveInsightAnswerDto) {
    return this.systemFeedbackService.saveInsightAnswer(
      req.user.id,
      dto.questionType,
      dto.answer,
      dto.lessonId,
    );
  }
}