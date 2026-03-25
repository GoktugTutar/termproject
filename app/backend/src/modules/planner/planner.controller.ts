import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Get('schedule')
  getSchedule(@Req() req: any) {
    return this.plannerService.generateSchedule(req.user.sub);
  }
}
