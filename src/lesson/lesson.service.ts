import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonService {
  constructor(private prisma: PrismaService) {}

  // Kullanıcının tüm derslerini sınav tarihleriyle birlikte getir
  async findAll(userId: number) {
    return this.prisma.lesson.findMany({
      where: { userId },
      include: { exams: true, deadlines: true },
    });
  }

  // Yeni ders oluştur
  async create(userId: number, dto: CreateLessonDto) {
    return this.prisma.lesson.create({
      data: { ...dto, userId },
      include: { exams: true, deadlines: true },
    });
  }

  // Mevcut dersi güncelle
  async update(userId: number, lessonId: number, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    if (lesson.userId !== userId) throw new ForbiddenException();

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: dto,
      include: { exams: true, deadlines: true },
    });
  }

  // Dersi ve bağlı tüm verileri sil
  async remove(userId: number, lessonId: number) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    if (lesson.userId !== userId) throw new ForbiddenException();

    return this.prisma.lesson.delete({ where: { id: lessonId } });
  }

  // Derse sınav tarihi ekle
  async addExam(userId: number, lessonId: number, examDate: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    if (lesson.userId !== userId) throw new ForbiddenException();

    return this.prisma.lessonExam.create({
      data: { lessonId, examDate: new Date(examDate) },
    });
  }

  // Derse deadline / ödev ekle
  async addDeadline(userId: number, lessonId: number, deadlineDate: string, title?: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    if (lesson.userId !== userId) throw new ForbiddenException();

    return this.prisma.lessonDeadline.create({
      data: { lessonId, deadlineDate: new Date(deadlineDate), title: title ?? null },
    });
  }

  // Deadline sil
  async removeDeadline(userId: number, lessonId: number, deadlineId: number) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    if (lesson.userId !== userId) throw new ForbiddenException();

    const deadline = await this.prisma.lessonDeadline.findUnique({ where: { id: deadlineId } });
    if (!deadline || deadline.lessonId !== lessonId) throw new NotFoundException('Deadline bulunamadı');

    return this.prisma.lessonDeadline.delete({ where: { id: deadlineId } });
  }
}