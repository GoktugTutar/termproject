import { Repository } from 'typeorm';
import { UserEntity } from './user.entity.js';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto.js';
import { LessonEntity } from '../lesson/lesson.entity.js';
import { ChecklistEntity } from '../checklist/checklist.entity.js';
import { ScheduleEntity } from '../planner/schedule.entity.js';
export declare class UserService {
    private readonly repo;
    private readonly lessonRepo;
    private readonly checklistRepo;
    private readonly scheduleRepo;
    constructor(repo: Repository<UserEntity>, lessonRepo: Repository<LessonEntity>, checklistRepo: Repository<ChecklistEntity>, scheduleRepo: Repository<ScheduleEntity>);
    create(data: {
        email: string;
        password: string;
    }): Promise<UserEntity>;
    findById(id: string): Promise<UserEntity | null>;
    findByEmail(email: string): Promise<UserEntity | null>;
    updateProfile(id: string, dto: UpdateUserProfileDto): Promise<UserEntity>;
    delete(id: string): Promise<void>;
}
