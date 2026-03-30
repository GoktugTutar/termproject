export interface ILesson {
    id: string;
    userId: string;
    name: string;
    credit: number;
    difficulty: number;
    vizeDate: Date | null;
    finalDate: Date | null;
    homeworkDeadlines: string[];
    semester: number;
    delayCount: number;
}
