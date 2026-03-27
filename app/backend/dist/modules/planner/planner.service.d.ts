import { UserService } from '../user/user.service';
import { LessonService } from '../lesson/lesson.service';
import { HeuristicService, HeuristicResult } from '../heuristic/heuristic.service';
export interface DailySlot {
    day: string;
    dayLabel: string;
    lessonId: string;
    lessonName: string;
    hours: number;
    score: number;
}
export interface DailyPlan {
    date: string;
    freeHours: number;
    slots: DailySlot[];
}
export interface WeeklySchedule {
    generatedAt: string;
    weekStart: string;
    slots: DailySlot[];
    ranked: HeuristicResult[];
}
export declare class PlannerService {
    private readonly userService;
    private readonly lessonService;
    private readonly heuristicService;
    constructor(userService: UserService, lessonService: LessonService, heuristicService: HeuristicService);
    createWeeklyPlan(userId: string): WeeklySchedule;
    createDailyPlan(userId: string, freeHours: number): DailyPlan;
    private buildWeekDays;
    private todayStr;
}
