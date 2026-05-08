export interface LessonAllocation {
    lessonId: number;
    allocatedBlocks: number;
    effectiveBlocks: number;
}
export declare function step4CalculateX(lessons: Array<{
    id: number;
    difficulty: number;
    keyfiDelayCount: number;
    zorunluDelayCount: number;
    zorunluMissedBlocks: number;
    needsMoreTime: number;
}>, effectiveBlocks: number): LessonAllocation[];
