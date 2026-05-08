export declare class ChecklistItemDto {
    lessonId: number;
    plannedBlocks: number;
    completedBlocks: number;
    delayed?: boolean;
}
export declare class SubmitChecklistDto {
    stressLevel: number;
    fatigueLevel: number;
    items: ChecklistItemDto[];
}
