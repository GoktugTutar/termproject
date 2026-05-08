export declare class DebugController {
    getMode(): {
        mode: string;
        current: string;
    };
    setClock(body: {
        datetime?: string;
    }): {
        current: string;
    };
}
