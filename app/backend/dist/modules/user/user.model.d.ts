export type BusyTimeMap = Record<string, Record<string, string>>;
export interface IUser {
    id: string;
    email: string;
    password: string;
    name: string | null;
    gpa: number | null;
    semester: number | null;
    stressLevel: number;
    busyTimes: BusyTimeMap | null;
}
