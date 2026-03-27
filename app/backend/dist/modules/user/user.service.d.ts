import { User } from './user.model';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
export declare class UserService {
    private read;
    private write;
    findById(id: string): User | undefined;
    findByEmail(email: string): User | undefined;
    create(data: Pick<User, 'email' | 'password'>): User;
    updateProfile(id: string, dto: UpdateUserProfileDto): Omit<User, 'password'>;
}
