import { LessonEntity } from '../lesson/lesson.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { ChecklistEntity } from '../checklist/checklist.entity.js';
export interface HeuristicResult {
    lessonId: string;
    lessonName: string;
    H: number;
    U: number;
    R: number;
    X: number;
    D: number;
    S: number;
    B: number;
}
export declare class HeuristicService {
    calculateX(lesson: LessonEntity, allLessons: LessonEntity[]): number;
    calculateU(lesson: LessonEntity, now?: Date): number;
    calculateR(lesson: LessonEntity, allLessons: LessonEntity[], weekChecklists: ChecklistEntity[], isFirstDay: boolean): number;
    calculateH(U: number, R: number, D: number, S: number, B: number): number;
    calculate(lesson: LessonEntity, allLessons: LessonEntity[], user: UserEntity, weekChecklists: ChecklistEntity[], isFirstDay: boolean): HeuristicResult;
    rankLessons(lessons: LessonEntity[], user: UserEntity, weekChecklists: ChecklistEntity[], isFirstDay: boolean): HeuristicResult[];
}
