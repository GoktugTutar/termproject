import { Lesson } from './lesson.model';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
export declare class LessonService {
    private read;
    private write;
    findAllByUser(userId: string): Lesson[];
    findById(id: string): Lesson | undefined;
    findByName(userId: string, lessonName: string): Lesson | undefined;
    bulkCreate(userId: string, dtos: CreateLessonDto[]): Lesson[];
    update(userId: string, dto: UpdateLessonDto): Lesson;
    applyChecklistResult(id: string, userId: string, plannedHours: number, actualHours: number | null): Lesson;
    remove(id: string, userId: string): void;
}
