export declare class DeadlineDto {
    type: 'midterm' | 'final' | 'homework';
    date: string;
    label?: string;
}
export declare class CreateLessonDto {
    lessonName: string;
    difficulty: number;
    deadlines: DeadlineDto[];
    semester: string;
}
