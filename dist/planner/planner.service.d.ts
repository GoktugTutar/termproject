import { PrismaService } from '../prisma/prisma.service';
export declare class PlannerService {
    private prisma;
    constructor(prisma: PrismaService);
    private getWeekStart;
    private timeToMin;
    private minToTime;
    private mergeBusySlots;
    private getFreeWindows;
    createWeeklyPlan(userId: number): Promise<{
        weekStart: Date;
        blocks: ({
            lesson: {
                id: number;
                name: string;
                userId: number;
                difficulty: number;
                keyfiDelayCount: number;
                zorunluDelayCount: number;
                zorunluMissedBlocks: number;
                needsMoreTime: number;
            };
        } & {
            id: number;
            startTime: string;
            endTime: string;
            userId: number;
            lessonId: number;
            weekStart: Date;
            date: Date;
            blockCount: number;
            isReview: boolean;
            completed: boolean;
        })[];
    }>;
    getWeekBlocks(userId: number): Promise<{
        weekStart: Date;
        blocks: ({
            lesson: {
                id: number;
                name: string;
                userId: number;
                difficulty: number;
                keyfiDelayCount: number;
                zorunluDelayCount: number;
                zorunluMissedBlocks: number;
                needsMoreTime: number;
            };
        } & {
            id: number;
            startTime: string;
            endTime: string;
            userId: number;
            lessonId: number;
            weekStart: Date;
            date: Date;
            blockCount: number;
            isReview: boolean;
            completed: boolean;
        })[];
    }>;
    recalculate(userId: number): Promise<{
        weekStart: Date;
        blocks: ({
            lesson: {
                id: number;
                name: string;
                userId: number;
                difficulty: number;
                keyfiDelayCount: number;
                zorunluDelayCount: number;
                zorunluMissedBlocks: number;
                needsMoreTime: number;
            };
        } & {
            id: number;
            startTime: string;
            endTime: string;
            userId: number;
            lessonId: number;
            weekStart: Date;
            date: Date;
            blockCount: number;
            isReview: boolean;
            completed: boolean;
        })[];
    }>;
}
