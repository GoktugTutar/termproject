import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { AddExamDto } from './dto/add-exam.dto';
import { AddDeadlineDto } from './dto/add-deadline.dto';
export declare class LessonController {
    private lessonService;
    constructor(lessonService: LessonService);
    findAll(req: any): Promise<({
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
    create(req: any, dto: CreateLessonDto): Promise<{
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
    update(req: any, id: number, dto: UpdateLessonDto): Promise<{
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
    remove(req: any, id: number): Promise<{
        id: number;
        name: string;
        userId: number;
        difficulty: number;
        keyfiDelayCount: number;
        zorunluDelayCount: number;
        zorunluMissedBlocks: number;
        needsMoreTime: number;
    }>;
    addExam(req: any, id: number, dto: AddExamDto): Promise<{
        id: number;
        examDate: Date;
        lessonId: number;
    }>;
    addDeadline(req: any, id: number, dto: AddDeadlineDto): Promise<{
        id: number;
        lessonId: number;
        deadlineDate: Date;
        title: string | null;
    }>;
    removeDeadline(req: any, id: number, deadlineId: number): Promise<{
        id: number;
        lessonId: number;
        deadlineDate: Date;
        title: string | null;
    }>;
}
