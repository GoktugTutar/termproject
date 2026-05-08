import { StudyTime, StudyStyle } from '@prisma/client';
export declare class BusySlotDto {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    fatigueLevel: number;
}
export declare class SetupUserDto {
    preferredStudyTime?: StudyTime;
    studyStyle?: StudyStyle;
    busySlots?: BusySlotDto[];
}
