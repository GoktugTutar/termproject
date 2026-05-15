import { Controller, Post, Put, Body, UseGuards, Request, Get, HttpCode } from '@nestjs/common';
import { UserService } from './user.service';
import { PlannerService } from '../planner/planner.service';
import { SetupUserDto } from './dto/setup-user.dto';
import { UpdateBuslySlotsDto } from './dto/update-busy-slots.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private plannerService: PlannerService,
  ) {}

  // Giriş yapan kullanıcının profilini getir
  @Get('me')
  getMe(@Request() req) {
    return this.userService.getProfile(req.user.id);
  }

  // Kullanıcı tercihlerini ilk kez kur
  @Post('setup')
  setup(@Request() req, @Body() dto: SetupUserDto) {
    return this.userService.setup(req.user.id, dto);
  }

  // BusySlot'ları güncelle ve planı yeniden oluştur
  @Put('busy-slots')
  async updateBusySlots(@Request() req, @Body() dto: UpdateBuslySlotsDto) {
    await this.userService.updateBusySlots(req.user.id, dto.busySlots);
    return this.plannerService.createWeeklyPlan(req.user.id);
  }

  // Dijital ikiz profilini getir
  @Get('student-profile')
  getStudentProfile(@Request() req) {
    return this.userService.getStudentProfile(req.user.id);
  }

  // Aktif dönemi sonlandır
  @Post('end-term')
  @HttpCode(200)
  endTerm(@Request() req) {
    return this.userService.endTerm(req.user.id);
  }

  // Yeni dönem başlat (aktif dönem varsa önce kapatılır)
  @Post('start-term')
  startTerm(@Request() req, @Body() body: { name?: string }) {
    return this.userService.startTerm(req.user.id, body?.name);
  }
}