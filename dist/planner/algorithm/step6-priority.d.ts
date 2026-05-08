export type PriorityLevel = 'KRITIK' | 'YUKSEK' | 'ORTA' | 'DUSUK';
export interface LessonPriority {
    lessonId: number;
    priority: PriorityLevel;
    priorityScore: number;
    slottedMode: boolean;
}
export declare function step6Priority(lessons: Array<{
    id: number;
    difficulty: number;
    keyfiDelayCount: number;
    zorunluDelayCount: number;
    exams: Array<{
        examDate: Date;
    }>;
}>, now: Date): LessonPriority[];
