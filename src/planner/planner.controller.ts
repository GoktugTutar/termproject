import { Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('planner')
export class PlannerController {
  constructor(private plannerService: PlannerService) {}

  // Haftalık programı oluştur (Pazar / ilk kurulum)
  @Post('create')
  create(@Request() req) {
    return this.plannerService.createWeeklyPlan(req.user.id);
  }

  // BusySlot değişikliğinde yeniden hesapla
  @Post('recalculate')
  recalculate(@Request() req) {
    return this.plannerService.recalculate(req.user.id);
  }

  // Haftanın bloklarını getir
  @Get('week')
  getWeek(@Request() req) {
    return this.plannerService.getWeekBlocks(req.user.id);
  }
}
