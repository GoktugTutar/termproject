import { Repository } from 'typeorm';
import { UserEntity } from './user.entity.js';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto.js';
export declare class UserService {
    private readonly repo;
    constructor(repo: Repository<UserEntity>);
    create(data: {
        email: string;
        password: string;
    }): Promise<UserEntity>;
    findById(id: string): Promise<UserEntity | null>;
    findByEmail(email: string): Promise<UserEntity | null>;
    updateProfile(id: string, dto: UpdateUserProfileDto): Promise<UserEntity>;
}
