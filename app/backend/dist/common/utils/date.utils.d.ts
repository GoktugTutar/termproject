export declare function daysBetween(from: Date, to: Date): number;
export declare function todayString(): string;
export declare function getDayName(date?: Date): string;
export declare function isMonday(date?: Date): boolean;
export declare function parseTimeRange(range: string): {
    start: number;
    end: number;
};
export declare function formatTimeRange(start: number, end: number): string;
