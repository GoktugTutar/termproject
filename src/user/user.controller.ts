import {
  Controller,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Get,
  HttpCode,
} from '@nestjs/common';
import { UserService } from './user.service';
import { SetupUserDto } from './dto/setup-user.dto';
import { UpdateBuslySlotsDto } from './dto/update-busy-slots.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

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

  // BusySlot'ları güncelle (planı otomatik değiştirmez)
  @Put('busy-slots')
  async updateBusySlots(@Request() req, @Body() dto: UpdateBuslySlotsDto) {
    return this.userService.updateBusySlots(req.user.id, dto.busySlots);
  }

  // Dijital ikiz profilini getir
  @Get('student-profile')
  getStudentProfile(@Request() req) {
    return this.userService.getStudentProfile(req.user.id);
  }

  // Belirli bir günün notunu getir
  @Get('daily-note/:date')
  getDailyNote(@Request() req, @Param('date') date: string) {
    return this.userService.getDailyNote(req.user.id, date);
  }

  // Belirli bir günün notunu kaydet/güncelle
  @Put('daily-note/:date')
  saveDailyNote(
    @Request() req,
    @Param('date') date: string,
    @Body() body: { content?: string },
  ) {
    return this.userService.saveDailyNote(
      req.user.id,
      date,
      body?.content ?? '',
    );
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
