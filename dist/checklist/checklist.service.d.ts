import { PrismaService } from '../prisma/prisma.service';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
export declare class ChecklistService {
    private prisma;
    constructor(prisma: PrismaService);
    submit(userId: number, dto: SubmitChecklistDto): Promise<({
        items: {
            id: number;
            lessonId: number;
            checklistId: number;
            plannedBlocks: number;
            completedBlocks: number;
            delayed: boolean;
        }[];
    } & {
        id: number;
        fatigueLevel: number;
        userId: number;
        date: Date;
        stressLevel: number;
    }) | null>;
    getByDate(userId: number, dateStr: string): Promise<({
        items: {
            id: number;
            lessonId: number;
            checklistId: number;
            plannedBlocks: number;
            completedBlocks: number;
            delayed: boolean;
        }[];
    } & {
        id: number;
        fatigueLevel: number;
        userId: number;
        date: Date;
        stressLevel: number;
    }) | null>;
}
