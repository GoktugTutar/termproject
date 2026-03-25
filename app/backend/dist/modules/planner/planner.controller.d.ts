import { PlannerService } from './planner.service';
export declare class PlannerController {
    private readonly plannerService;
    constructor(plannerService: PlannerService);
    getSchedule(req: any): import("./planner.service").WeeklySchedule;
}
