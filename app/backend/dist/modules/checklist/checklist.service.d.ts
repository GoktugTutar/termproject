import { Repository } from 'typeorm';
import { ChecklistEntity } from './checklist.entity.js';
import { SubmitChecklistDto } from './dto/submit-checklist.dto.js';
import { LessonService } from '../lesson/lesson.service.js';
import { ScheduleEntity } from '../planner/schedule.entity.js';
export declare class ChecklistService {
    private readonly repo;
    private readonly scheduleRepo;
    private readonly lessonService;
    constructor(repo: Repository<ChecklistEntity>, scheduleRepo: Repository<ScheduleEntity>, lessonService: LessonService);
    createForToday(userId: string): Promise<ChecklistEntity>;
    getTodayChecklist(userId: string): Promise<{
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
    submit(userId: string, dto: SubmitChecklistDto): Promise<ChecklistEntity>;
    getWeekChecklists(userId: string): Promise<ChecklistEntity[]>;
    getEarlyCompletedIds(userId: string): Promise<string[]>;
}
