export type ExamType = 'quiz' | 'midterm' | 'final';
export type Difficulty = 1 | 2 | 3;
export interface Lesson {
    id: string;
    userId: string;
    lessonName: string;
    difficulty: Difficulty;
    examDate: string;
    examType: ExamType;
    allocatedHours: number;
    remaining: number;
    delay: number;
    createdAt: string;
}
