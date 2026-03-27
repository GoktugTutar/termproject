import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsNumber, Min } from 'class-validator';

class DailyUpdateDto {
  @IsNumber()
  @Min(0)
  freeHours: number;
}

@UseGuards(JwtAuthGuard)
@Controller('planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  /**
   * POST /planner/create
   * Heuristik tabanlı haftalık plan oluşturur
   */
  @Post('create')
  createWeeklyPlan(@Req() req: any) {
    return this.plannerService.createWeeklyPlan(req.user.sub);
  }

  /**
   * POST /planner/dailyupdate
   * Kullanıcının bugünkü boş saatine göre günlük plan üretir
   */
  @Post('dailyupdate')
  dailyUpdate(@Req() req: any, @Body() dto: DailyUpdateDto) {
    return this.plannerService.createDailyPlan(req.user.sub, dto.freeHours);
  }
}
