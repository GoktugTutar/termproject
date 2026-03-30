import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ChecklistService } from './checklist.service.js';
import { SubmitChecklistDto } from './dto/submit-checklist.dto.js';
import { UserEntity } from '../user/user.entity.js';

@UseGuards(JwtAuthGuard)
@Controller('checklist')
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  // POST /checklist/create
  @Post('create')
  create(@CurrentUser() user: UserEntity) {
    return this.checklistService.createForToday(user.id);
  }

  // GET /checklist/get
  @Get('get')
  get(@CurrentUser() user: UserEntity) {
    return this.checklistService.getTodayChecklist(user.id);
  }

  // POST /checklist/submit
  @Post('submit')
  submit(@CurrentUser() user: UserEntity, @Body() dto: SubmitChecklistDto) {
    return this.checklistService.submit(user.id, dto);
  }
}
