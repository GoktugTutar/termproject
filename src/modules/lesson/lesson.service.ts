import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonService {
  constructor(private readonly prisma: PrismaService) {}

  async registerMany(userId: string, dtos: CreateLessonDto[]) {
    const results: any[] = [];
    for (const dto of dtos) {
      const lesson = await this.prisma.lesson.create({
        data: {
          userId,
          name: dto.name,
          credit: dto.credit,
          difficulty: dto.difficulty,
          semester: dto.semester,
          remainingTopicsCount: dto.remainingTopicsCount ?? 0,
          delayCount: 0,
          exams: {
            create: this.normalizeExamInputs(dto).map((exam) => ({
              examType: exam.examType,
              examDate: new Date(exam.examDate),
              weightPercentage: exam.weightPercentage ?? null,
            })),
          },
        },
        include: { exams: true },
      });
      results.push(this.serializeLesson(lesson));
    }
    return results;
  }

  async update(userId: string, lessonName: string, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { userId, name: lessonName },
      include: { exams: true },
    });
    if (!lesson) throw new NotFoundException(`Lesson "${lessonName}" not found`);

    await this.prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.credit !== undefined && { credit: dto.credit }),
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
        ...(dto.semester !== undefined && { semester: dto.semester }),
        ...(dto.remainingTopicsCount !== undefined && { remainingTopicsCount: dto.remainingTopicsCount }),
      },
    });

    if (this.shouldReplaceExams(dto)) {
      await this.prisma.lessonExam.deleteMany({ where: { lessonId: lesson.id } });
      const exams = this.normalizeExamInputs(dto);
      if (exams.length > 0) {
        await this.prisma.lessonExam.createMany({
          data: exams.map((exam) => ({
            lessonId: lesson.id,
            examType: exam.examType,
            examDate: new Date(exam.examDate),
            weightPercentage: exam.weightPercentage ?? null,
          })),
        });
      }
    }

    const updated = await this.prisma.lesson.findUnique({
      where: { id: lesson.id },
      include: { exams: true },
    });
    if (!updated) throw new NotFoundException(`Lesson "${lessonName}" not found`);
    return this.serializeLesson(updated);
  }

  async findByUserId(userId: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { userId },
      include: { exams: true },
      orderBy: { createdAt: 'asc' },
    });
    return lessons.map((l) => this.serializeLesson(l));
  }

  async findEntitiesByUserId(userId: string) {
    return this.prisma.lesson.findMany({
      where: { userId },
      include: { exams: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.lesson.findUnique({ where: { id }, include: { exams: true } });
  }

  async incrementDelay(lessonId: string) {
    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { delayCount: { increment: 1 } },
    });
  }

  async delete(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({ where: { id: lessonId, userId } });
    if (!lesson) throw new NotFoundException(`Lesson "${lessonId}" not found`);
    await this.prisma.lesson.delete({ where: { id: lessonId } });
  }

  serializeLesson(lesson: any) {
    const exams = [...(lesson.exams ?? [])].sort(
      (a: any, b: any) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime(),
    );
    const midterm = exams.find((e: any) => e.examType === 'midterm') ?? null;
    const final = exams.find((e: any) => e.examType === 'final') ?? null;
    const homeworkDeadlines = exams
      .filter((e: any) => !['midterm', 'final'].includes(e.examType))
      .map((e: any) => new Date(e.examDate).toISOString());

    return {
      id: lesson.id,
      userId: lesson.userId,
      name: lesson.name,
      credit: lesson.credit,
      difficulty: lesson.difficulty,
      semester: lesson.semester,
      remainingTopicsCount: lesson.remainingTopicsCount,
      delayCount: lesson.delayCount,
      vizeDate: midterm ? new Date(midterm.examDate).toISOString() : null,
      finalDate: final ? new Date(final.examDate).toISOString() : null,
      homeworkDeadlines,
      exams: exams.map((e: any) => ({
        id: e.id,
        examType: e.examType,
        examDate: new Date(e.examDate).toISOString(),
        weightPercentage: e.weightPercentage,
      })),
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
    };
  }

  private shouldReplaceExams(dto: UpdateLessonDto): boolean {
    return (
      dto.exams !== undefined ||
      dto.vizeDate !== undefined ||
      dto.finalDate !== undefined ||
      dto.homeworkDeadlines !== undefined
    );
  }

  private normalizeExamInputs(dto: CreateLessonDto | UpdateLessonDto) {
    return [
      ...(dto.exams ?? []),
      ...(dto.vizeDate ? [{ examType: 'midterm', examDate: dto.vizeDate }] : []),
      ...(dto.finalDate ? [{ examType: 'final', examDate: dto.finalDate }] : []),
      ...((dto.homeworkDeadlines ?? []).map((examDate) => ({ examType: 'quiz', examDate }))),
    ];
  }
}
