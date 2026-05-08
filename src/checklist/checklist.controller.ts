import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('checklist')
export class ChecklistController {
  constructor(private checklistService: ChecklistService) {}

  // Günlük checklist gönder
  @Post('submit')
  submit(@Request() req, @Body() dto: SubmitChecklistDto) {
    return this.checklistService.submit(req.user.id, dto);
  }

  // Tarihe göre checklist getir
  @Get(':date')
  getByDate(@Request() req, @Param('date') date: string) {
    return this.checklistService.getByDate(req.user.id, date);
  }
}
