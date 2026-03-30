import { Controller, Put, Delete, Body, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UserService } from './user.service.js';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto.js';
import { UserEntity } from './user.entity.js';

@UseGuards(JwtAuthGuard)
@Controller('person')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Put('update')
  updateProfile(
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Delete('delete')
  @HttpCode(204)
  delete(@CurrentUser() user: UserEntity) {
    return this.userService.delete(user.id);
  }
}
