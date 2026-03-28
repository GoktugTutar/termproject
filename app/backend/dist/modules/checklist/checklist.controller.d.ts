import { ChecklistService } from './checklist.service';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
declare class SlotDto {
    lessonId: string;
    lessonName: string;
    hours: number;
}
declare class CreateChecklistDto {
    slots: SlotDto[];
}
export declare class ChecklistController {
    private readonly checklistService;
    constructor(checklistService: ChecklistService);
    getAll(req: any): Promise<import("./checklist.model").ChecklistItem[]>;
    getToday(req: any): Promise<import("./checklist.model").ChecklistItem[]>;
    create(req: any, dto: CreateChecklistDto): Promise<import("./checklist.model").ChecklistItem[]>;
    submit(req: any, dto: SubmitChecklistDto): Promise<import("./checklist.model").ChecklistItem & {
        remainingDisplay: string;
    }>;
}
export {};
