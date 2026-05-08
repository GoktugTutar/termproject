import { ChecklistService } from './checklist.service';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
export declare class ChecklistController {
    private checklistService;
    constructor(checklistService: ChecklistService);
    submit(req: any, dto: SubmitChecklistDto): Promise<({
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
    getByDate(req: any, date: string): Promise<({
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
