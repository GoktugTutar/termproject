import { ReviewBlock } from './step3-review-blocks';
export interface TimeWindow {
    start: number;
    end: number;
}
export declare function step7_5PlaceReview(reviewBlocks: ReviewBlock[], freeWindows: Record<string, TimeWindow[]>, preferredStudyTime: string, lessonAllocations: Record<number, number>): {
    placed: Array<{
        lessonId: number;
        date: Date;
        startMin: number;
        endMin: number;
        isReview: boolean;
        blockCount: number;
    }>;
    updatedAllocations: Record<number, number>;
    updatedFreeWindows: Record<string, TimeWindow[]>;
};
