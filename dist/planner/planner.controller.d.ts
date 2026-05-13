import { PlannerService } from './planner.service';
export declare class PlannerController {
    private plannerService;
    constructor(plannerService: PlannerService);
    create(req: any): Promise<{
        programZorlastu: boolean;
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
    recalculate(req: any): Promise<{
        programZorlastu: boolean;
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
    getWeek(req: any): Promise<{
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
