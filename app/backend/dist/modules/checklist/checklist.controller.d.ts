import { ChecklistService } from './checklist.service.js';
import { SubmitChecklistDto } from './dto/submit-checklist.dto.js';
import { UserEntity } from '../user/user.entity.js';
export declare class ChecklistController {
    private readonly checklistService;
    constructor(checklistService: ChecklistService);
    create(user: UserEntity): Promise<import("./checklist.entity.js").ChecklistEntity>;
    get(user: UserEntity): Promise<{
        id: string;
        date: string;
        submitted: boolean;
        lessons: {
            lessonId: string;
            allocatedHours: number;
            remainingHours: number;
            hoursCompleted: number | null;
        }[];
    }>;
    submit(user: UserEntity, dto: SubmitChecklistDto): Promise<import("./checklist.entity.js").ChecklistEntity>;
}
