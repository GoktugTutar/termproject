export type ChecklistStatus = 'pending' | 'early' | 'completed' | 'incomplete' | 'not_done';
export interface ChecklistItem {
    id: string;
    userId: string;
    lessonId: string;
    lessonName: string;
    date: string;
    plannedHours: number;
    actualHours: number | null;
    status: ChecklistStatus;
    remaining: number | null;
    createdAt: Date | string;
}
