import type { BusyTimeMap } from '../user.model.js';
export declare class UpdateUserProfileDto {
    name?: string;
    gpa?: number;
    semester?: number;
    stressLevel?: number;
    busyTimes?: BusyTimeMap;
}
