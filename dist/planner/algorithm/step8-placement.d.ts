import { DayConfig } from './step5-day-distribution';
export type LessonClass = 'AGIR' | 'ORTA' | 'HAFIF';
export type DayClass = 'rahat' | 'normal' | 'yorucu';
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
    difficulty: number;
    priority: string;
}>, lessonAllocations: Record<number, number>, dayConfigs: DayConfig[], freeWindows: Record<string, TimeWindow[]>, preferredStudyTime: string): {
    placed: PlacedBlock[];
    notFitted: Record<number, number>;
    programZorlastu: boolean;
};
