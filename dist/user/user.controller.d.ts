import { UserService } from './user.service';
import { SetupUserDto } from './dto/setup-user.dto';
import { UpdateBuslySlotsDto } from './dto/update-busy-slots.dto';
export declare class UserController {
    private userService;
    constructor(userService: UserService);
    getMe(req: any): Promise<({
        busySlots: {
            id: number;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            fatigueLevel: number;
            userId: number;
        }[];
    } & {
        id: number;
        email: string;
        passwordHash: string;
        preferredStudyTime: import(".prisma/client").$Enums.StudyTime;
        studyStyle: import(".prisma/client").$Enums.StudyStyle;
    }) | null>;
    setup(req: any, dto: SetupUserDto): Promise<({
        busySlots: {
            id: number;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            fatigueLevel: number;
            userId: number;
        }[];
    } & {
        id: number;
        email: string;
        passwordHash: string;
        preferredStudyTime: import(".prisma/client").$Enums.StudyTime;
        studyStyle: import(".prisma/client").$Enums.StudyStyle;
    }) | null>;
    updateBusySlots(req: any, dto: UpdateBuslySlotsDto): Promise<({
        busySlots: {
            id: number;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            fatigueLevel: number;
            userId: number;
        }[];
    } & {
        id: number;
        email: string;
        passwordHash: string;
        preferredStudyTime: import(".prisma/client").$Enums.StudyTime;
        studyStyle: import(".prisma/client").$Enums.StudyStyle;
    }) | null>;
}
