import { Repository } from 'typeorm';
import { LessonEntity } from './lesson.entity.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
export declare class LessonService {
    private readonly repo;
    constructor(repo: Repository<LessonEntity>);
    registerMany(userId: string, dtos: CreateLessonDto[]): Promise<LessonEntity[]>;
    update(userId: string, lessonName: string, dto: UpdateLessonDto): Promise<LessonEntity>;
    findByUserId(userId: string): Promise<LessonEntity[]>;
    findById(id: string): Promise<LessonEntity | null>;
    incrementDelay(lessonId: string): Promise<void>;
    delete(userId: string, lessonId: string): Promise<void>;
}
