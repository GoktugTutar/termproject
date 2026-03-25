import { ChecklistItem } from './checklist.model';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { LessonService } from '../lesson/lesson.service';
export declare class ChecklistService {
    private readonly lessonService;
    constructor(lessonService: LessonService);
    private read;
    private write;
    getToday(userId: string): ChecklistItem[];
    getAll(userId: string): ChecklistItem[];
    createFromSlots(userId: string, slots: {
        lessonId: string;
        lessonName: string;
        hours: number;
    }[]): ChecklistItem[];
    submit(userId: string, dto: SubmitChecklistDto): ChecklistItem;
}
