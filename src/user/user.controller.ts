import { Controller, Post, Put, Body, UseGuards, Request, Get } from '@nestjs/common';
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

  // BusySlot'ları güncelle
  @Put('busy-slots')
  updateBusySlots(@Request() req, @Body() dto: UpdateBuslySlotsDto) {
    return this.userService.updateBusySlots(req.user.id, dto.busySlots);
  }
}
