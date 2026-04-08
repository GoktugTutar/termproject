import {
  Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@UseGuards(JwtAuthGuard)
@Controller('lesson')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Get()
  get(@CurrentUser() user: any) {
    return this.lessonService.findByUserId(user.id);
  }

  @Post('register')
  register(@CurrentUser() user: any, @Body() dtos: CreateLessonDto[]) {
    return this.lessonService.registerMany(user.id, dtos);
  }

  @Put('update/:name')
  update(
    @CurrentUser() user: any,
    @Param('name') name: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonService.update(user.id, name, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.lessonService.delete(user.id, id);
  }
}
