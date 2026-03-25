import { Lesson } from './lesson.model';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { TrackLessonDto } from './dto/track-lesson.dto';
export declare class LessonService {
    private read;
    private write;
    findAllByUser(userId: string): Lesson[];
    findById(id: string): Lesson | undefined;
    create(userId: string, dto: CreateLessonDto): Lesson;
    update(id: string, userId: string, dto: UpdateLessonDto): Lesson;
    trackProgress(id: string, userId: string, dto: TrackLessonDto): Lesson;
    remove(id: string, userId: string): void;
}
