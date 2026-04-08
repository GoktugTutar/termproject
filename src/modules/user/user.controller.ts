import {
  Body, Controller, Delete, Get, HttpCode, Put, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('person')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  me(@CurrentUser() user: any) {
    return this.userService.getProfile(user.id);
  }

  @Put('update')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateUserProfileDto) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Delete('delete')
  @HttpCode(204)
  delete(@CurrentUser() user: any) {
    return this.userService.delete(user.id);
  }
}
