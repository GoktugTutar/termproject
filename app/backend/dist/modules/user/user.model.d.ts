export interface User {
    id: string;
    email: string;
    password: string;
    name?: string;
    gpa?: number;
    semester?: string;
    stress: number;
    busyTimes: string[];
    createdAt: string;
}
