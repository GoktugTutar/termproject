export interface ReviewBlock {
    lessonId: number;
    date: Date;
    blocks: number;
}
export declare function step3ReviewBlocks(lessons: Array<{
    id: number;
    difficulty: number;
    exams: Array<{
        examDate: Date;
    }>;
}>, effectiveBlocks: number, weekStart: Date, weekEnd: Date): {
    reviewBlocks: ReviewBlock[];
    reservedByLesson: Record<number, number>;
};
