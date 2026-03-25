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
import { TrackLessonDto } from './dto/track-lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('lesson')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateLessonDto) {
    return this.lessonService.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.lessonService.findAllByUser(req.user.sub);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.lessonService.update(id, req.user.sub, dto);
  }

  @Patch(':id/progress')
  trackProgress(@Req() req: any, @Param('id') id: string, @Body() dto: TrackLessonDto) {
    return this.lessonService.trackProgress(id, req.user.sub, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    this.lessonService.remove(id, req.user.sub);
    return { message: 'Ders silindi' };
  }
}
