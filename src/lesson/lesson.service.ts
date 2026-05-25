import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { SaveExamResultDto } from './dto/save-exam-result.dto';

@Injectable()
export class LessonService {
  constructor(private prisma: PrismaService) {}

  // Kullanıcının tüm derslerini sınav tarihleriyle birlikte getir (sadece aktif dönem)
  async findAll(userId: number) {
    const activeTerm = await this.prisma.term.findFirst({
      where: { userId, isActive: true },
    });
    return this.prisma.lesson.findMany({
      where: { userId, termId: activeTerm ? activeTerm.id : null },
      include: {
        exams: true,
        deadlines: true,
        examResults: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  // Yeni ders oluştur (aktif döneme bağla)
  async create(userId: number, dto: CreateLessonDto) {
    const activeTerm = await this.prisma.term.findFirst({
      where: { userId, isActive: true },
    });
    return this.prisma.lesson.create({
      data: { ...dto, userId, termId: activeTerm?.id ?? null },
      include: { exams: true, deadlines: true },
    });
  }

  // Mevcut dersi güncelle
  async update(userId: number, lessonId: number, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
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
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    if (lesson.userId !== userId) throw new ForbiddenException();

    return this.prisma.lesson.delete({ where: { id: lessonId } });
  }

  // Derse sınav tarihi ekle
  async addExam(userId: number, lessonId: number, examDate: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    if (lesson.userId !== userId) throw new ForbiddenException();

    return this.prisma.lessonExam.create({
      data: { lessonId, examDate: new Date(examDate) },
    });
  }

  // Derse deadline / ödev ekle
  async addDeadline(
    userId: number,
    lessonId: number,
    deadlineDate: string,
    title?: string,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    if (lesson.userId !== userId) throw new ForbiddenException();

    return this.prisma.lessonDeadline.create({
      data: {
        lessonId,
        deadlineDate: new Date(deadlineDate),
        title: title ?? null,
      },
    });
  }

  // Deadline sil
  async removeDeadline(userId: number, lessonId: number, deadlineId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    if (lesson.userId !== userId) throw new ForbiddenException();

    const deadline = await this.prisma.lessonDeadline.findUnique({
      where: { id: deadlineId },
    });
    if (!deadline || deadline.lessonId !== lessonId)
      throw new NotFoundException('Deadline bulunamadı');

    return this.prisma.lessonDeadline.delete({ where: { id: deadlineId } });
  }

  async saveExamResult(
    userId: number,
    lessonId: number,
    dto: SaveExamResultDto,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { exams: true },
    });
    if (!lesson) throw new NotFoundException('Ders bulunamadı');
    if (lesson.userId !== userId) throw new ForbiddenException();

    const exam = lesson.exams.find((e) => e.id === dto.examId);
    if (!exam) throw new NotFoundException('Sınav bulunamadı');

    const existing = await this.prisma.examResult.findFirst({
      where: { userId, lessonId, examId: dto.examId },
    });
    const data = {
      grade: dto.grade?.trim() || null,
      satisfied: dto.satisfied ?? null,
      failReason: dto.satisfied === false ? (dto.failReason ?? null) : null,
    };

    if (existing) {
      return this.prisma.examResult.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.examResult.create({
      data: {
        userId,
        lessonId,
        examId: dto.examId,
        ...data,
      },
    });
  }

  async removeExamResult(userId: number, lessonId: number, examId: number) {
    const existing = await this.prisma.examResult.findFirst({
      where: { userId, lessonId, examId },
    });
    if (!existing) return { deleted: false };

    await this.prisma.examResult.delete({ where: { id: existing.id } });
    return { deleted: true };
  }
}
