import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PlannerService } from './planner.service.js';
import { UserEntity } from '../user/user.entity.js';

@UseGuards(JwtAuthGuard)
@Controller('planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  // POST /planner/create — called at end of day after checklist submission
  @Post('create')
  create(@CurrentUser() user: UserEntity) {
    return this.plannerService.create(user.id);
  }

  // GET /planner/schedule
  @Get('schedule')
  getSchedule(@CurrentUser() user: UserEntity) {
    return this.plannerService.getSchedule(user.id);
  }
}
