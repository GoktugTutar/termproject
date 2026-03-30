import { UserService } from './user.service.js';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto.js';
import { UserEntity } from './user.entity.js';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    updateProfile(user: UserEntity, dto: UpdateUserProfileDto): Promise<UserEntity>;
    delete(user: UserEntity): Promise<void>;
}
