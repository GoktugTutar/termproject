import { Repository } from 'typeorm';
import { ChecklistEntity } from './checklist.entity';
import { ChecklistItem } from './checklist.model';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { LessonService } from '../lesson/lesson.service';
export declare class ChecklistService {
    private readonly checklistRepo;
    private readonly lessonService;
    constructor(checklistRepo: Repository<ChecklistEntity>, lessonService: LessonService);
    getAll(userId: string): Promise<ChecklistItem[]>;
    getToday(userId: string): Promise<ChecklistItem[]>;
    createFromSlots(userId: string, slots: {
        lessonId: string;
        lessonName: string;
        hours: number;
    }[]): Promise<ChecklistItem[]>;
    submit(userId: string, dto: SubmitChecklistDto): Promise<ChecklistItem & {
        remainingDisplay: string;
    }>;
    private formatRemaining;
}
