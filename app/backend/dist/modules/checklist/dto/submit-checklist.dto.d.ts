export declare class SubmitChecklistDto {
    lessonId: string;
    actualHours?: number;
    status: 'early' | 'completed' | 'incomplete' | 'not_done';
}
