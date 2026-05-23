import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiCoachService } from './ai-coach.service';
import { WhatIfScenario } from './prompts/what-if.prompt';

@UseGuards(JwtAuthGuard)
@Controller('ai-coach')
export class AiCoachController {
  constructor(private readonly aiCoachService: AiCoachService) {}

  /**
   * POST /ai-coach/what-if
   * userId JWT'den alınır.
   * Body: { scenario, focusLessonId?, emptyDayName?, emptyDayBlockCount? }
   */
  @Post('what-if')
  async whatIf(
    @Request() req: any,
    @Body()
    body: {
      scenario: WhatIfScenario;
      focusLessonId?: number;
      emptyDayName?: string;
      emptyDayBlockCount?: number;
    },
  ) {
    const userId = req.user.id as number;
    return this.aiCoachService.whatIfPreview(
      userId,
      body.scenario,
      body.focusLessonId,
      body.emptyDayName,
      body.emptyDayBlockCount,
    );
  }

  /**
   * POST /ai-coach/daily-coach
   * userId JWT'den alınır.
   */
  @Post('daily-coach')
  async dailyCoach(@Request() req: any) {
    const userId = req.user.id as number;
    return this.aiCoachService.getDailyCoachMessage(userId);
  }
}