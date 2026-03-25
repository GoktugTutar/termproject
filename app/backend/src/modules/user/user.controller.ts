import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateStressDto } from './dto/update-stress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    const user = this.userService.findById(req.user.sub);
    if (!user) return null;
    const { password: _pw, ...rest } = user;
    return rest;
  }

  @Patch('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdateUserProfileDto) {
    return this.userService.updateProfile(req.user.sub, dto);
  }

  @Patch('stress')
  updateStress(@Req() req: any, @Body() dto: UpdateStressDto) {
    return this.userService.updateStress(req.user.sub, dto.stress);
  }
}
