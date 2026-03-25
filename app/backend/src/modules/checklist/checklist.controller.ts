import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('checklist')
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Get()
  getAll(@Req() req: any) {
    return this.checklistService.getAll(req.user.sub);
  }

  @Get('today')
  getToday(@Req() req: any) {
    return this.checklistService.getToday(req.user.sub);
  }

  @Patch('submit')
  submit(@Req() req: any, @Body() dto: SubmitChecklistDto) {
    return this.checklistService.submit(req.user.sub, dto);
  }
}
