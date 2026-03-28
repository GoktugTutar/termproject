import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { User } from './user.model';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
export declare class UserService {
    private readonly userRepo;
    constructor(userRepo: Repository<UserEntity>);
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    create(data: Pick<User, 'email' | 'password'>): Promise<User>;
    updateProfile(id: string, dto: UpdateUserProfileDto): Promise<Omit<User, 'password'>>;
}
