import { Repository } from 'typeorm';
import { ScheduleEntity } from './schedule.entity.js';
import { HeuristicService } from '../heuristic/heuristic.service.js';
import { LessonService } from '../lesson/lesson.service.js';
import { UserService } from '../user/user.service.js';
import { ChecklistService } from '../checklist/checklist.service.js';
export declare class PlannerService {
    private readonly scheduleRepo;
    private readonly heuristicService;
    private readonly lessonService;
    private readonly userService;
    private readonly checklistService;
    constructor(scheduleRepo: Repository<ScheduleEntity>, heuristicService: HeuristicService, lessonService: LessonService, userService: UserService, checklistService: ChecklistService);
    create(userId: string): Promise<ScheduleEntity | null>;
    getSchedule(userId: string): Promise<ScheduleEntity>;
    private buildFullWeek;
    private updateFutureDays;
    private fillDays;
    private normalizeBusyEntries;
    private buildFreeRanges;
    private expandBusyHours;
    private currentWeekRange;
}
