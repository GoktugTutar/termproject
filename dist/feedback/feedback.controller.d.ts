import { FeedbackService } from './feedback.service';
import { WeeklyFeedbackDto } from './dto/weekly-feedback.dto';
export declare class FeedbackController {
    private feedbackService;
    constructor(feedbackService: FeedbackService);
    saveWeekly(req: any, dto: WeeklyFeedbackDto): Promise<any>;
    getMessages(req: any): Promise<{
        type: string;
        message: string;
        suggestion: string;
    }[]>;
}
