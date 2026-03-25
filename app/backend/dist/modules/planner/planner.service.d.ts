import { UserService } from '../user/user.service';
import { LessonService } from '../lesson/lesson.service';
import { HeuristicService, HeuristicResult } from '../heuristic/heuristic.service';
export interface ScheduleSlot {
    day: string;
    dayLabel: string;
    lessonId: string;
    lessonName: string;
    hours: number;
    score: number;
}
export interface WeeklySchedule {
    generatedAt: string;
    weekStart: string;
    slots: ScheduleSlot[];
    ranked: HeuristicResult[];
}
export declare class PlannerService {
    private readonly userService;
    private readonly lessonService;
    private readonly heuristicService;
    constructor(userService: UserService, lessonService: LessonService, heuristicService: HeuristicService);
    generateSchedule(userId: string): WeeklySchedule;
    private buildWeekDays;
    private getWeekStart;
}
