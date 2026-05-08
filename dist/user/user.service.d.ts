import { PrismaService } from '../prisma/prisma.service';
import { SetupUserDto } from './dto/setup-user.dto';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    setup(userId: number, dto: SetupUserDto): Promise<({
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
    updateBusySlots(userId: number, busySlots: any[]): Promise<({
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
    getProfile(userId: number): Promise<({
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
