export interface User {
    id: string;
    name: string;
    email: string;
    password: string;
    department?: string;
    grade?: string;
    stress: number;
    createdAt: string;
}
