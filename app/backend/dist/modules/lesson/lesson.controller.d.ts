import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
export declare class LessonController {
    private readonly lessonService;
    constructor(lessonService: LessonService);
    register(req: any, dtos: CreateLessonDto[]): import("./lesson.model").Lesson[];
    findAll(req: any): import("./lesson.model").Lesson[];
    update(req: any, dto: UpdateLessonDto): import("./lesson.model").Lesson;
    remove(req: any, id: string): {
        message: string;
    };
}
