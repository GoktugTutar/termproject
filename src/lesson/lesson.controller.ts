import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { AddExamDto } from './dto/add-exam.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('lesson')
export class LessonController {
  constructor(private lessonService: LessonService) {}

  // Kullanıcının tüm derslerini listele
  @Get()
  findAll(@Request() req) {
    return this.lessonService.findAll(req.user.id);
  }

  // Yeni ders oluştur
  @Post()
  create(@Request() req, @Body() dto: CreateLessonDto) {
    return this.lessonService.create(req.user.id, dto);
  }

  // Mevcut dersi güncelle
  @Put(':id')
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonService.update(req.user.id, id, dto);
  }

  // Dersi sil
  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.lessonService.remove(req.user.id, id);
  }

  // Derse sınav tarihi ekle
  @Post(':id/exam')
  addExam(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddExamDto,
  ) {
    return this.lessonService.addExam(req.user.id, id, dto.examDate);
  }
}
