export interface TimeWindow {
    start: number;
    end: number;
}
export interface PlacedBlock {
    lessonId: number;
    date: Date;
    startMin: number;
    endMin: number;
    blockCount: number;
    isReview: boolean;
}
export declare function step8Placement(lessonOrder: Array<{
    lessonId: number;
    slottedMode: boolean;
}>, lessonAllocations: Record<number, number>, dayConfigs: Array<{
    date: Date;
    maxBlocks: number;
    maxBlocksPerSession: number;
}>, freeWindows: Record<string, TimeWindow[]>, preferredStudyTime: string): {
    placed: PlacedBlock[];
    notFitted: Record<number, number>;
};
