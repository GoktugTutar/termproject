import { ChecklistService } from './checklist.service';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
export declare class ChecklistController {
    private readonly checklistService;
    constructor(checklistService: ChecklistService);
    getAll(req: any): import("./checklist.model").ChecklistItem[];
    getToday(req: any): import("./checklist.model").ChecklistItem[];
    submit(req: any, dto: SubmitChecklistDto): import("./checklist.model").ChecklistItem;
}
