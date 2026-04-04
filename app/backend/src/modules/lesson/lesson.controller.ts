import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { LessonService } from './lesson.service.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { UserEntity } from '../user/user.entity.js';

@UseGuards(JwtAuthGuard)
@Controller('lesson')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Get()
  get(@CurrentUser() user: UserEntity) {
    return this.lessonService.findByUserId(user.id);
  }

  // POST /lesson/register — body: CreateLessonDto[]
  @Post('register')
  register(@CurrentUser() user: UserEntity, @Body() dtos: CreateLessonDto[]) {
    return this.lessonService.registerMany(user.id, dtos);
  }

  // PUT /lesson/update/:name
  @Put('update/:name')
  update(
    @CurrentUser() user: UserEntity,
    @Param('name') name: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonService.update(user.id, name, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    return this.lessonService.delete(user.id, id);
  }
}
