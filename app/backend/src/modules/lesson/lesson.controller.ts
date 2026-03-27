import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('lesson')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  /**
   * POST /lesson/register
   * JSON dizisi olarak birden fazla ders kaydeder
   */
  @Post('register')
  register(@Req() req: any, @Body() dtos: CreateLessonDto[]) {
    return this.lessonService.bulkCreate(req.user.sub, dtos);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.lessonService.findAllByUser(req.user.sub);
  }

  /**
   * PATCH /lesson/update
   * Ders adına göre günceller
   */
  @Patch('update')
  update(@Req() req: any, @Body() dto: UpdateLessonDto) {
    return this.lessonService.update(req.user.sub, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    this.lessonService.remove(id, req.user.sub);
    return { message: 'Ders silindi' };
  }
}
