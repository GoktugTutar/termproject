import { UserService } from './user.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getMe(req: any): {
        id: string;
        email: string;
        name?: string;
        gpa?: number;
        semester?: string;
        stress: number;
        busyTimes: string[];
        createdAt: string;
    } | null;
    update(req: any, dto: UpdateUserProfileDto): Omit<import("./user.model").User, "password">;
}
