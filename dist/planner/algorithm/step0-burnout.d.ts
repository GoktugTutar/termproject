export interface BurnoutResult {
    maxBlocksPerSession: number;
    burnoutDetected: boolean;
}
export declare function step0Burnout(completedBlocks: number, plannedBlocks: number, currentMax: number): BurnoutResult;
