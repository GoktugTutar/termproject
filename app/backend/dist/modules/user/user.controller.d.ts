import { UserService } from './user.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getMe(req: any): Promise<{
        id: string;
        email: string;
        name?: string;
        gpa?: number;
        semester?: string;
        stress: number;
        busyTimes: string[];
        createdAt: Date | string;
    } | null>;
    update(req: any, dto: UpdateUserProfileDto): Promise<Omit<import("./user.model").User, "password">>;
}
