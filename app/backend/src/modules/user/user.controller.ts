import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('person')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getMe(@Req() req: any) {
    const user = await this.userService.findById(req.user.sub);
    if (!user) return null;
    const { password: _pw, ...rest } = user;
    return rest;
  }

  @Patch('update')
  update(@Req() req: any, @Body() dto: UpdateUserProfileDto) {
    return this.userService.updateProfile(req.user.sub, dto);
  }
}
