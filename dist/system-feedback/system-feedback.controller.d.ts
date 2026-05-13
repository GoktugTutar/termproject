import { SystemFeedbackService } from './system-feedback.service';
export declare class SystemFeedbackController {
    private systemFeedbackService;
    constructor(systemFeedbackService: SystemFeedbackService);
    getMessage(req: any): Promise<{
        message: string;
    }>;
}
