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
        deadlines: {
            id: number;
            lessonId: number;
            deadlineDate: Date;
            title: string | null;
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
        deadlines: {
            id: number;
            lessonId: number;
            deadlineDate: Date;
            title: string | null;
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
        deadlines: {
            id: number;
            lessonId: number;
            deadlineDate: Date;
            title: string | null;
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
    addDeadline(userId: number, lessonId: number, deadlineDate: string, title?: string): Promise<{
        id: number;
        lessonId: number;
        deadlineDate: Date;
        title: string | null;
    }>;
    removeDeadline(userId: number, lessonId: number, deadlineId: number): Promise<{
        id: number;
        lessonId: number;
        deadlineDate: Date;
        title: string | null;
    }>;
}
