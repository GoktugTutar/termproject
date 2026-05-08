export interface DayConfig {
    date: Date;
    dayOfWeek: number;
    maxBlocks: number;
    maxSessions: number;
    maxBlocksPerSession: number;
    avgFatigue: number;
    isCokYorucu: boolean;
    isRahat: boolean;
}
export declare function step5DayDistribution(effectiveBlocks: number, weekDays: Array<{
    date: Date;
    dayOfWeek: number;
    busySlots: Array<{
        fatigueLevel: number;
    }>;
}>, studyStyle: string, maxBlocksPerSessionFromBurnout: number): DayConfig[];
