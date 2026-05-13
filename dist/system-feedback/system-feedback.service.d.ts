import { PrismaService } from '../prisma/prisma.service';
export declare class SystemFeedbackService {
    private prisma;
    constructor(prisma: PrismaService);
    getMessage(userId: number): Promise<{
        message: string;
    }>;
}
