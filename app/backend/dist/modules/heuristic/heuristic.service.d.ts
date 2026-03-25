import { Lesson } from '../lesson/lesson.model';
export interface HeuristicInput {
    lesson: Lesson;
    stress: number;
    today: Date;
}
export interface HeuristicResult {
    lessonId: string;
    lessonName: string;
    score: number;
    studyHours: number;
}
export declare class HeuristicService {
    private daysUntilExam;
    private calcUrgency;
    private calcRemaining;
    private calcDelayBonus;
    calcScore(input: HeuristicInput): number;
    calcStudyHours(lesson: Lesson, allLessons: Lesson[]): number;
    rankLessons(lessons: Lesson[], stress: number, today: Date): HeuristicResult[];
}
