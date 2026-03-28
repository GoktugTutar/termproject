import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsArray, IsNumber, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SlotDto {
  @IsString()
  lessonId: string;

  @IsString()
  lessonName: string;

  @IsNumber()
  @Min(0)
  hours: number;
}

class CreateChecklistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots: SlotDto[];
}

@UseGuards(JwtAuthGuard)
@Controller('checklist')
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  /**
   * GET /checklist/get
   * Kullanıcının tüm checklist öğeleri (kalan süre R ile birlikte)
   */
  @Get('get')
  getAll(@Req() req: any) {
    return this.checklistService.getAll(req.user.sub);
  }

  @Get('today')
  getToday(@Req() req: any) {
    return this.checklistService.getToday(req.user.sub);
  }

  /**
   * POST /checklist/create
   * Planner slotlarından bugünün checklist'ini oluşturur
   */
  @Post('create')
  create(@Req() req: any, @Body() dto: CreateChecklistDto) {
    return this.checklistService.createFromSlots(req.user.sub, dto.slots);
  }

  /**
   * PATCH /checklist/submit
   * Gün sonu checklist sonucu gönderilir
   */
  @Patch('submit')
  submit(@Req() req: any, @Body() dto: SubmitChecklistDto) {
    return this.checklistService.submit(req.user.sub, dto);
  }
}
