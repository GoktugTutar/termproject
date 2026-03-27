export type DeadlineType = 'midterm' | 'final' | 'homework';
export interface Deadline {
    type: DeadlineType;
    date: string;
    label?: string;
}
export interface Lesson {
    id: string;
    userId: string;
    lessonName: string;
    difficulty: number;
    deadlines: Deadline[];
    semester: string;
    delay: number;
    createdAt: string;
}
