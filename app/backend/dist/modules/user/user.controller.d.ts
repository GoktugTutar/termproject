import { UserService } from './user.service.js';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto.js';
import { UserEntity } from './user.entity.js';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    me(user: UserEntity): Promise<import("./user.service.js").PublicUser>;
    updateProfile(user: UserEntity, dto: UpdateUserProfileDto): Promise<import("./user.service.js").PublicUser>;
    delete(user: UserEntity): Promise<void>;
}
