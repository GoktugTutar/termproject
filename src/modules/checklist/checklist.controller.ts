import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChecklistService } from './checklist.service';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';

@UseGuards(JwtAuthGuard)
@Controller('checklist')
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Post('create')
  create(@CurrentUser() user: any) {
    return this.checklistService.createForToday(user.id);
  }

  @Get('get')
  get(@CurrentUser() user: any) {
    return this.checklistService.getTodayChecklist(user.id);
  }

  @HttpCode(200)
  @Post('submit')
  submit(@CurrentUser() user: any, @Body() dto: SubmitChecklistDto) {
    return this.checklistService.submit(user.id, dto);
  }
}
