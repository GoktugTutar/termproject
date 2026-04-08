import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlannerService } from './planner.service';

@UseGuards(JwtAuthGuard)
@Controller('planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Post('create')
  create(@CurrentUser() user: any) {
    return this.plannerService.create(user.id);
  }

  @Get('schedule')
  getSchedule(@CurrentUser() user: any) {
    return this.plannerService.getSchedule(user.id);
  }
}
