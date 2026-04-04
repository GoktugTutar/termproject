import { LessonService } from './lesson.service.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { UserEntity } from '../user/user.entity.js';
export declare class LessonController {
    private readonly lessonService;
    constructor(lessonService: LessonService);
    get(user: UserEntity): Promise<import("./lesson.entity.js").LessonEntity[]>;
    register(user: UserEntity, dtos: CreateLessonDto[]): Promise<import("./lesson.entity.js").LessonEntity[]>;
    update(user: UserEntity, name: string, dto: UpdateLessonDto): Promise<import("./lesson.entity.js").LessonEntity>;
    delete(user: UserEntity, id: string): Promise<void>;
}
