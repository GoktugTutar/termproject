import { PlannerService } from './planner.service';
declare class DailyUpdateDto {
    freeHours: number;
}
export declare class PlannerController {
    private readonly plannerService;
    constructor(plannerService: PlannerService);
    createWeeklyPlan(req: any): import("./planner.service").WeeklySchedule;
    dailyUpdate(req: any, dto: DailyUpdateDto): import("./planner.service").DailyPlan;
}
export {};
