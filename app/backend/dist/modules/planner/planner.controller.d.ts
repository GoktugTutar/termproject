import { PlannerService } from './planner.service.js';
import { UserEntity } from '../user/user.entity.js';
export declare class PlannerController {
    private readonly plannerService;
    constructor(plannerService: PlannerService);
    create(user: UserEntity): Promise<import("./schedule.entity.js").ScheduleEntity | null>;
    getSchedule(user: UserEntity): Promise<import("./schedule.entity.js").ScheduleEntity>;
}
