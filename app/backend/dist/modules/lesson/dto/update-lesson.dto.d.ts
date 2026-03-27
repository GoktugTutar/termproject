import { DeadlineDto } from './create-lesson.dto';
export declare class UpdateLessonDto {
    lessonName: string;
    newLessonName?: string;
    difficulty?: number;
    deadlines?: DeadlineDto[];
    semester?: string;
}
