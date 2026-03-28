import { Repository } from 'typeorm';
import { LessonEntity } from './lesson.entity';
import { Lesson } from './lesson.model';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
export declare class LessonService {
    private readonly lessonRepo;
    constructor(lessonRepo: Repository<LessonEntity>);
    findAllByUser(userId: string): Promise<Lesson[]>;
    findById(id: string): Promise<Lesson | null>;
    findByName(userId: string, lessonName: string): Promise<Lesson | null>;
    bulkCreate(userId: string, dtos: CreateLessonDto[]): Promise<Lesson[]>;
    update(userId: string, dto: UpdateLessonDto): Promise<Lesson>;
    applyChecklistResult(id: string, userId: string, plannedHours: number, actualHours: number | null): Promise<void>;
    remove(id: string, userId: string): Promise<void>;
}
