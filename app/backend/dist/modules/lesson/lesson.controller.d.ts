import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { TrackLessonDto } from './dto/track-lesson.dto';
export declare class LessonController {
    private readonly lessonService;
    constructor(lessonService: LessonService);
    create(req: any, dto: CreateLessonDto): import("./lesson.model").Lesson;
    findAll(req: any): import("./lesson.model").Lesson[];
    update(req: any, id: string, dto: UpdateLessonDto): import("./lesson.model").Lesson;
    trackProgress(req: any, id: string, dto: TrackLessonDto): import("./lesson.model").Lesson;
    remove(req: any, id: string): {
        message: string;
    };
}
