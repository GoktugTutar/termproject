import { PrismaService } from '../prisma/prisma.service';
import { WeeklyFeedbackDto } from './dto/weekly-feedback.dto';
export declare class FeedbackService {
    private prisma;
    constructor(prisma: PrismaService);
    saveWeeklyFeedback(userId: number, dto: WeeklyFeedbackDto): Promise<any>;
    getMessages(userId: number): Promise<{
        type: string;
        message: string;
        suggestion: string;
    }[]>;
    private getWeekStart;
    private daysUntilExam;
}
