import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
export declare class LessonService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(userId: number): Promise<({
        exams: {
            id: number;
            examDate: Date;
            lessonId: number;
        }[];
    } & {
        id: number;
        name: string;
        userId: number;
        difficulty: number;
        keyfiDelayCount: number;
        zorunluDelayCount: number;
        zorunluMissedBlocks: number;
        needsMoreTime: number;
    })[]>;
    create(userId: number, dto: CreateLessonDto): Promise<{
        exams: {
            id: number;
            examDate: Date;
            lessonId: number;
        }[];
    } & {
        id: number;
        name: string;
        userId: number;
        difficulty: number;
        keyfiDelayCount: number;
        zorunluDelayCount: number;
        zorunluMissedBlocks: number;
        needsMoreTime: number;
    }>;
    update(userId: number, lessonId: number, dto: UpdateLessonDto): Promise<{
        exams: {
            id: number;
            examDate: Date;
            lessonId: number;
        }[];
    } & {
        id: number;
        name: string;
        userId: number;
        difficulty: number;
        keyfiDelayCount: number;
        zorunluDelayCount: number;
        zorunluMissedBlocks: number;
        needsMoreTime: number;
    }>;
    remove(userId: number, lessonId: number): Promise<{
        id: number;
        name: string;
        userId: number;
        difficulty: number;
        keyfiDelayCount: number;
        zorunluDelayCount: number;
        zorunluMissedBlocks: number;
        needsMoreTime: number;
    }>;
    addExam(userId: number, lessonId: number, examDate: string): Promise<{
        id: number;
        examDate: Date;
        lessonId: number;
    }>;
}
