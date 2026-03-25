import { UserService } from './user.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateStressDto } from './dto/update-stress.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getProfile(req: any): {
        id: string;
        name: string;
        email: string;
        department?: string;
        grade?: string;
        stress: number;
        createdAt: string;
    } | null;
    updateProfile(req: any, dto: UpdateUserProfileDto): Omit<import("./user.model").User, "password">;
    updateStress(req: any, dto: UpdateStressDto): Omit<import("./user.model").User, "password">;
}
