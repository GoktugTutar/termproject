export interface ChecklistLesson {
    lessonId: string;
    allocatedHours: number;
    hoursCompleted: number | null;
}
export interface IChecklist {
    id: string;
    userId: string;
    date: string;
    lessons: ChecklistLesson[];
    submitted: boolean;
}
