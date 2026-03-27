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
    urgencyDays: number;
}
export declare class HeuristicService {
    getNextExamDate(lesson: Lesson, today: Date): string | null;
    private calcUrgency;
    calcScore(input: HeuristicInput, allLessons: Lesson[]): number;
    calcStudyHours(lesson: Lesson, allLessons: Lesson[]): number;
    rankLessons(lessons: Lesson[], stress: number, today: Date): HeuristicResult[];
}
