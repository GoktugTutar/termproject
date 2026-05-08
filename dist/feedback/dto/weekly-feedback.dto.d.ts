export declare class LessonFeedbackDto {
    lessonId: number;
    needsMoreTime: number;
}
export declare class WeeklyFeedbackDto {
    weekloadFeedback: string;
    lessonFeedbacks: LessonFeedbackDto[];
}
